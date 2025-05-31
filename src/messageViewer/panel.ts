import { utcTicks } from "d3-time";
import { ObservableScope } from "inertial";
import { Disposable, WebviewPanel } from "vscode";
import {
  ResponseError,
  type PartitionConsumeRecord,
  type PartitionOffset,
  type SimpleConsumeMultiPartitionRequest,
  type SimpleConsumeMultiPartitionResponse,
} from "../clients/sidecar";
import { showJsonPreview } from "../documentProviders/message";
import { logError } from "../errors";
import { Logger } from "../logging";
import { type KafkaTopic } from "../models/topic";
import { showErrorNotificationWithButtons } from "../notifications";
import { type SidecarHandle } from "../sidecar";
import { BitSet, includesSubstring, Stream } from "../stream/stream";
import { hashed, logUsage, UserEvent } from "../telemetry/events";
import { handleWebviewMessage } from "../webview/comms/comms";
import { type post } from "../webview/message-viewer";
import { MessageViewerConfig } from "./config";
import {
  DEFAULT_CONSUME_PARAMS,
  DEFAULT_MAX_POLL_RECORDS,
  getConsumeParams,
  getTextFilterParams,
  prepareMessage,
  Timer,
  truncateValue,
} from "./utils";

const logger = new Logger("messageViewer.panel");

type MessageSender = OverloadUnion<typeof post>;
type MessageResponse<MessageType extends string> = Awaited<
  ReturnType<Extract<MessageSender, (type: MessageType, body: any) => any>>
>;

/**
 * Creates and configures a message viewer panel with polling and message handling
 */
export function createMessageViewerPanel(
  panel: WebviewPanel,
  config: MessageViewerConfig,
  onConfigChange: (config: MessageViewerConfig) => void,
  topic: KafkaTopic,
  sidecar: SidecarHandle,
  schedule: <T>(cb: () => Promise<T>, signal?: AbortSignal) => Promise<T>,
): Disposable {
  const service = sidecar.getKafkaConsumeApi(topic.connectionId);
  const partitionApi = sidecar.getPartitionV3Api(topic.clusterId, topic.connectionId);

  const consume = async (
    request: SimpleConsumeMultiPartitionRequest,
    signal: AbortSignal,
  ): Promise<SimpleConsumeMultiPartitionResponse> => {
    const response =
      await service.gatewayV1ClustersClusterIdTopicsTopicNamePartitionsConsumePostRaw(
        {
          cluster_id: topic.clusterId,
          topic_name: topic.name,
          x_connection_id: topic.connectionId,
          SimpleConsumeMultiPartitionRequest: request,
        },
        { signal },
      );
    return response.raw.json();
  };

  const os = ObservableScope();

  /** Is stream currently running or being paused?  */
  const state = os.signal<"running" | "paused">("running");
  const timer = os.signal(Timer.create());
  /** Consume mode: are we consuming from the beginning, expecting the newest messages, or targeting a timestamp. */
  const mode = os.signal<"beginning" | "latest" | "timestamp">(config.consumeMode);

  /** Parameters used by Consume API. */
  const params = os.signal<SimpleConsumeMultiPartitionRequest>(getInitialParams(config));
  /** List of currently consumed partitions. `null` for all partitions. */
  const partitionConsumed = os.signal<number[] | null>(config.partitionConsumed);
  /** List of currently filtered partitions. `null` for all consumed partitions. */
  const partitionFilter = os.signal<number[] | null>(config.partitionFilter);
  /** Filter by range of timestamps. `null` for all consumed messages. */
  const timestampFilter = os.signal<[number, number] | null>(config.timestampFilter);
  /** Filter by substring text query. Persists bitset instead of computing it. */
  const textFilter = os.signal<{ bitset: BitSet; regexp: RegExp; query: string } | null>(
    config.textFilter != null ? getTextFilterParams(config.textFilter, config.messageLimit) : null,
  );
  /** The stream instance that holds consumed messages and index them by timestamp and partition. */
  const stream = os.signal(new Stream(config.messageLimit));
  /**
   * A boolean that indicates if the stream reached its capacity.
   * Continuing consumption after this means overriding oldest messages.
   */
  const isStreamFull = os.signal(false);

  /** Most recent response payload from Consume API. */
  const latestResult = os.signal<SimpleConsumeMultiPartitionResponse | null>(null);
  /** Most recent failure info */
  const latestError = os.signal<{ message: string } | null>(null);

  /** Wrapper for `panel.visible` that gracefully switches to `false` when panel is disposed. */
  const panelActive = os.produce(true, (value, signal) => {
    const disposed = panel.onDidDispose(() => value(false));
    const changedState = panel.onDidChangeViewState(() => value(panel.visible));
    signal.onabort = () => (disposed.dispose(), changedState.dispose());
  });

  /** Notify an active webview only after flushing the rest of updates. */
  const notifyUI = () => {
    queueMicrotask(() => {
      if (panelActive()) panel.webview.postMessage(["Refresh", "Success", null]);
    });
  };

  /** Provides partition filter bitset based on the most recent consumed result. */
  const partitionBitset = os.derive<BitSet | null>(() => {
    const result = latestResult();
    const { capacity, partition } = stream();
    const ids = partitionFilter();
    if (ids == null || result == null) return null;
    const bitset = new BitSet(capacity);
    for (const partitionId of ids) {
      let range = partition.range(partitionId, partitionId);
      if (range == null) continue;
      const next = partition.next;
      let cursor = range[0];
      while (true) {
        bitset.set(cursor);
        if (cursor === range[1]) break;
        cursor = next[cursor];
      }
    }
    return bitset;
  });

  /** Provides timestamp range filter bitset based on the most recent consumed result. */
  const timestampBitset = os.derive<BitSet | null>(() => {
    const result = latestResult();
    const { capacity, timestamp } = stream();
    const ts = timestampFilter();
    if (ts == null || result == null) return null;
    const bitset = new BitSet(capacity);
    const [lo, hi] = ts;
    let range = timestamp.range(lo, hi);
    if (range == null) return bitset;
    const next = timestamp.next;
    let cursor = range[0];
    while (true) {
      bitset.set(cursor);
      if (cursor === range[1]) break;
      cursor = next[cursor];
    }
    return bitset;
  });

  /** Used in derive below. Search bitset retains reference but internal value keeps changing */
  const alwaysNotEqual = () => false;
  const searchBitset = os.derive<BitSet | null>(() => textFilter()?.bitset ?? null, alwaysNotEqual);

  /** Single bitset that represents the intersection of all currently applied filters. */
  const bitset = os.derive(() => {
    const partition = partitionBitset();
    const timestamp = timestampBitset();
    const search = searchBitset();
    let result: BitSet | null = null;
    for (const bitset of [partition, timestamp, search]) {
      if (bitset == null) continue;
      result = result == null ? bitset.copy() : result.intersection(bitset);
    }
    return result;
  });

  const histogram = os.derive(() => {
    // update this derivative after new batch of messages is consumed
    latestResult();
    const ts = stream().timestamp;
    if (ts.size === 0) return null;

    // domain is defined by earliest and latest dates that are conveniently accessible via skiplist
    const d0 = ts.getValue(ts.tail)!;
    const d1 = ts.getValue(ts.head)!;
    // following generates uniform ticks that are always between the domain extent
    const uniformTicks = utcTicks(new Date(d0), new Date(d1), 70).map((v) => v.valueOf());
    let left = 0;
    let right = uniformTicks.length;
    while (uniformTicks.length > 0 && uniformTicks.at(left)! <= d0) left++;
    while (uniformTicks.length > 0 && uniformTicks.at(right - 1)! > d1) right--;
    let ticks = left < right ? uniformTicks.slice(left, right) : uniformTicks;
    if (ticks.length === 0) return null;

    /* Following algorithm counts number of records per each bin (aka histogram).
    Bins are formed by uniformly distributed ticks which are timestamps between
    oldest and newest timestamps:
        lo • tick • • • tick • • • tick • • • tick • • hi
    Bins have inclusive left boundary and right exclusive boundary. The last bin has
    right inclusive. For each bin we need to count total number of records along
    with number of records that satisfy currently applied filter.
    Timestamp skiplist has descending order, so `head` means newest and `tail` means
    oldest. Iterating from `head`, for each tick we find the insertion point (like
    bisect left) in the skiplist and count number of records between the point and
    the one we used in previous iteration. */
    const bits = bitset();
    const includes = bits != null ? bits.predicate() : () => false;
    const bins: { x0: number; x1: number; total: number; filter: number | null }[] = [];
    const limit = ticks.length;
    let ahead = ts.head;
    for (let i = limit; i >= 0; i--) {
      const tick = i === 0 ? 0 : ticks[i - 1];
      const curr = i === 0 ? ts.tail : ts.find((p) => ts.getValue(p)! <= tick);
      const notEmptyBin = curr != null && ts.getValue(curr)! <= (ticks[i] ?? d1.valueOf());
      let total = 0;
      let filter = 0;
      if (notEmptyBin) {
        let next = ahead;
        // account for inclusive final bin
        if (i === limit) {
          total++;
          if (includes(next)) filter++;
        }
        if (next !== curr) {
          let max = ts.size;
          do {
            total++;
            // avoid counting the right bin boundary, it is covered by the next bin
            if (next !== ahead && includes(next)) filter++;
            next = ts.next[next];
          } while (max-- > 0 && next !== curr);
          // make sure to count the left bin boundary
          if (includes(curr)) filter++;
        }
      }
      if (curr != null) ahead = curr;
      const x0 = i === 0 ? d0 : ticks[i - 1];
      const x1 = i === limit ? d1 : ticks[i];
      bins.unshift({ x0, x1, total, filter: bits != null ? filter : null });
    }

    return bins;
  });

  let queue: PartitionConsumeRecord[] = [];
  function flushMessages(currentStream: Stream) {
    const search = os.peek(textFilter);
    while (queue.length > 0) {
      /* Pick messages from the queue one by one since we may stop putting 
      them into stream but we don't want to drop the rest. */
      const message = queue.shift()!;

      /* New messages inserted into the stream instance and its index is
      stored for further processing by existing filters. */
      const index = currentStream.insert(message);

      if (search != null) {
        if (includesSubstring(message, search.regexp)) {
          search.bitset.set(index);
        } else {
          search.bitset.unset(index);
        }
        searchBitset(search.bitset);
      }

      /* For the first time when the stream reaches defined capacity, we pause 
      consumption so the user can work with exact data they expected to consume.
      They still can resume the stream back to get into "windowed" mode. */
      if (!os.peek(isStreamFull) && currentStream.size >= currentStream.capacity) {
        isStreamFull(true);
        state("paused");
        timer((timer: Timer) => timer.pause());
        break;
      }
    }
  }

  function dropQueue() {
    queue = [];
  }

  os.watch(() => {
    // update config structure and send it back to the parent scope
    onConfigChange(
      config.copy({
        consumeMode: mode(),
        consumeTimestamp: params().timestamp,
        messageLimit: stream().capacity,
        partitionConsumed: partitionConsumed(),
        partitionFilter: partitionFilter(),
        timestampFilter: timestampFilter(),
        textFilter: textFilter()?.query ?? null,
      }),
    );
  });

  os.watch(async (signal: AbortSignal) => {
    /* Cannot proceed any further if state got paused by the user or other
    events. If the state changes, this watcher is notified once again. */
    if (state() !== "running") return;

    try {
      const currentStream = stream();
      const partitions = partitionConsumed();
      /* If current parameters were already used for successful request, the
      following request should consider offsets provided in previous results. */
      const requestParams = getOffsets(params(), latestResult(), partitions);
      /* Delegate an API call to shared scheduler. */
      const result = await schedule(() => consume(requestParams, signal), signal);

      const datalist = result.partition_data_list ?? [];
      for (const partition of datalist) {
        /* The very first request always going to include messages from all
        partitions. If we consume a subset of partitions, some messages need
        to be dropped. */
        if (partitions != null && !partitions.includes(partition.partition_id!)) continue;
        /* The messages that we _do_ process, are pushed to the queue, which
        then processes messages and puts them to the stream on its own pace. */
        const records = partition.records ?? [];
        for (const message of records) queue.push(message);
      }

      /* Update the state and notify the UI about another successful request processed. */
      os.batch(() => {
        flushMessages(currentStream);
        latestResult(result);
        latestError(null);
        notifyUI();
      });
    } catch (error) {
      handleConsumeError(error, os, state, timer, latestError, notifyUI);
    }
  });

  function processMessage(...[type, body]: Parameters<MessageSender>) {
    switch (type) {
      case "GetMessages": {
        const offset = body.page * body.pageSize;
        const limit = body.pageSize;
        const includes = bitset()?.predicate() ?? (() => true);
        const { results, indices } = stream().slice(offset, limit, includes);
        const messages = results.map(
          ({ partition_id, offset, timestamp, key, value, metadata }) => {
            key = truncateValue(key);
            value = truncateValue(value);
            return { partition_id, offset, timestamp, key, value, metadata };
          },
        );
        return { indices, messages } satisfies MessageResponse<"GetMessages">;
      }
      case "GetMessagesCount": {
        return {
          total: stream().messages.size,
          filter: bitset()?.count() ?? null,
        } satisfies MessageResponse<"GetMessagesCount">;
      }
      case "GetMessagesExtent": {
        const { timestamp } = stream();
        return (
          timestamp.size > 0
            ? [timestamp.getValue(timestamp.tail)!, timestamp.getValue(timestamp.head)!]
            : null
        ) satisfies MessageResponse<"GetMessagesExtent">;
      }
      case "GetPartitionStats": {
        return partitionApi
          .listKafkaPartitions({ cluster_id: topic.clusterId, topic_name: topic.name })
          .then((v) => v.data) satisfies Promise<MessageResponse<"GetPartitionStats">>;
      }
      case "GetConsumedPartitions": {
        return partitionConsumed() satisfies MessageResponse<"GetConsumedPartitions">;
      }
      case "GetFilteredPartitions": {
        return partitionFilter() satisfies MessageResponse<"GetFilteredPartitions">;
      }
      case "GetConsumeMode": {
        return mode() satisfies MessageResponse<"GetConsumeMode">;
      }
      case "GetConsumeModeTimestamp": {
        return (params().timestamp ?? null) satisfies MessageResponse<"GetConsumeModeTimestamp">;
      }
      case "GetMaxSize": {
        return String(stream().capacity) satisfies MessageResponse<"GetMaxSize">;
      }
      case "GetStreamState": {
        return state() satisfies MessageResponse<"GetStreamState">;
      }
      case "GetStreamError": {
        return latestError() satisfies MessageResponse<"GetStreamError">;
      }
      case "GetStreamTimer": {
        return timer() satisfies MessageResponse<"GetStreamTimer">;
      }
      case "GetHistogram": {
        return histogram() satisfies MessageResponse<"GetHistogram">;
      }
      case "GetSelection": {
        return timestampFilter() satisfies MessageResponse<"GetSelection">;
      }
      case "GetSearchSource": {
        const search = textFilter();
        return (search?.regexp.source ?? null) satisfies MessageResponse<"GetSearchSource">;
      }
      case "GetSearchQuery": {
        const search = textFilter();
        return (search?.query ?? "") satisfies MessageResponse<"GetSearchQuery">;
      }
      case "PreviewMessageByIndex": {
        trackMessageViewerAction(topic, { action: "preview-message" });
        const { messages, serialized } = stream();
        const index = body.index;
        const message = messages.at(index);
        const payload = prepareMessage(
          message,
          serialized.key.includes(index),
          serialized.value.includes(index),
        );

        // use a single-instance provider to display a read-only document buffer with the message content
        const filename = `${topic.name}-message-${index}.json`;
        showJsonPreview(filename, payload, {
          partition: payload.partition_id,
          offset: payload.offset,
        });
        return null;
      }
      case "PreviewJSON": {
        trackMessageViewerAction(topic, { action: "preview-snapshot" });
        const {
          timestamp,
          messages: { values },
          serialized,
        } = stream();
        const includes = bitset()?.predicate() ?? (() => true);
        const records: string[] = [];
        for (
          let i = 0, p = timestamp.head, payload;
          i < timestamp.size;
          i++, p = timestamp.next[p]
        ) {
          if (includes(p)) {
            payload = prepareMessage(
              values[p],
              serialized.key.includes(p),
              serialized.value.includes(p),
            );
            records.push("\t" + JSON.stringify(payload));
          }
        }

        const content = `[\n${records.join(",\n")}\n]`;
        const filename = `${topic.name}-messages-${new Date().getTime()}.json`;
        showJsonPreview(filename, content);
        return null satisfies MessageResponse<"PreviewJSON">;
      }
      case "SearchMessages": {
        trackMessageViewerAction(topic, { action: "search" });
        if (body.search != null) {
          const { capacity, messages } = stream();
          const values = messages.values;
          const filter = getTextFilterParams(body.search, capacity);
          for (let i = 0; i < values.length; i++) {
            if (includesSubstring(values[i], filter.regexp)) {
              filter.bitset.set(i);
            }
          }
          textFilter(filter);
        } else {
          textFilter(null);
        }
        notifyUI();
        return null satisfies MessageResponse<"SearchMessages">;
      }
      case "StreamPause": {
        state("paused");
        timer((timer: Timer) => timer.pause());
        notifyUI();
        return null satisfies MessageResponse<"StreamPause">;
      }
      case "StreamResume": {
        state("running");
        timer((timer: Timer) => timer.resume());
        notifyUI();
        return null satisfies MessageResponse<"StreamResume">;
      }
      case "ConsumeModeChange": {
        trackMessageViewerAction(topic, { action: "consume-mode-change" });
        mode(body.mode);
        const maxPollRecords = Math.min(DEFAULT_MAX_POLL_RECORDS, os.peek(stream).capacity);
        params(getConsumeParams(body.mode, body.timestamp, maxPollRecords));
        stream((value) => new Stream(value.capacity));
        isStreamFull(false);
        textFilter((value) => {
          return value != null ? { ...value, bitset: new BitSet(value.bitset.capacity) } : null;
        });
        state("running");
        timer((timer: Timer) => timer.reset());
        latestResult(null);
        partitionFilter(null);
        timestampFilter(null);
        dropQueue();
        notifyUI();
        return null satisfies MessageResponse<"ConsumeModeChange">;
      }
      case "PartitionConsumeChange": {
        trackMessageViewerAction(topic, { action: "consume-partition-change" });
        partitionConsumed(body.partitions);
        const maxPollRecords = Math.min(DEFAULT_MAX_POLL_RECORDS, os.peek(stream).capacity);
        params((value) => getConsumeParams(os.peek(mode), value.timestamp, maxPollRecords));
        stream((value) => new Stream(value.capacity));
        isStreamFull(false);
        textFilter((value) => {
          return value != null ? { ...value, bitset: new BitSet(value.bitset.capacity) } : null;
        });
        state("running");
        timer((timer: Timer) => timer.reset());
        latestResult(null);
        partitionFilter(null);
        timestampFilter(null);
        dropQueue();
        notifyUI();
        return null satisfies MessageResponse<"PartitionConsumeChange">;
      }
      case "PartitionFilterChange": {
        trackMessageViewerAction(topic, { action: "filter-partition-change" });
        partitionFilter(body.partitions);
        notifyUI();
        return null satisfies MessageResponse<"PartitionFilterChange">;
      }
      case "TimestampFilterChange": {
        debouncedTrack(topic, { action: "filter-timestamp-change" });
        timestampFilter(body.timestamps);
        notifyUI();
        return null satisfies MessageResponse<"TimestampFilterChange">;
      }
      case "MessageLimitChange": {
        trackMessageViewerAction(topic, { action: "consume-message-limit-change" });
        const maxPollRecords = Math.min(DEFAULT_MAX_POLL_RECORDS, body.limit);
        params((value) => getConsumeParams(os.peek(mode), value.timestamp, maxPollRecords));
        stream(new Stream(body.limit));
        isStreamFull(false);
        textFilter((value) => {
          return value != null ? { ...value, bitset: new BitSet(body.limit) } : null;
        });
        state("running");
        timer((timer: Timer) => timer.reset());
        latestResult(null);
        partitionFilter(null);
        timestampFilter(null);
        dropQueue();
        notifyUI();
        return null satisfies MessageResponse<"MessageLimitChange">;
      }
    }
  }

  const handler = handleWebviewMessage(panel.webview, (...args) => {
    let result;
    os.batch(() => (result = processMessage(...args)));
    return result;
  });

  // Send telemetry for panel creation
  trackMessageViewerAction(topic, { action: "opened" });

  return Disposable.from(handler, { dispose: () => os.dispose() });
}

function getInitialParams(config: MessageViewerConfig): SimpleConsumeMultiPartitionRequest {
  return config.consumeMode === "latest"
    ? DEFAULT_CONSUME_PARAMS
    : config.consumeMode === "timestamp" && config.consumeTimestamp != null
      ? { ...DEFAULT_CONSUME_PARAMS, timestamp: config.consumeTimestamp }
      : { ...DEFAULT_CONSUME_PARAMS, from_beginning: true };
}

function handleConsumeError(
  error: any,
  os: any,
  state: any,
  timer: any,
  latestError: any,
  notifyUI: () => void,
) {
  let reportable: { message: string } | null = null;
  let shouldPause = false;

  if (error instanceof Error && error.name === "AbortError") return;

  if (error instanceof ResponseError) {
    const status = error.response.status;
    shouldPause = status >= 400;

    switch (status) {
      case 401:
        reportable = { message: "Authentication required." };
        break;
      case 403:
        reportable = { message: "Insufficient permissions to read from topic." };
        break;
      case 404:
        reportable = { message: "Topic not found." };
        break;
      case 429:
        reportable = { message: "Too many requests. Try again later." };
        break;
      default:
        reportable = { message: "Something went wrong." };
        logError(error, "message viewer", { extra: { status: status.toString() } });
        showErrorNotificationWithButtons("Error response while consuming messages.");
        break;
    }

    logger.error(`An error occurred during messages consumption. Status ${status}`);
  } else if (error instanceof Error) {
    logger.error(error.message);
    reportable = { message: "An internal error occurred." };
    shouldPause = true;
  }

  os.batch(() => {
    if (shouldPause) {
      state("paused");
      timer((timer: Timer) => timer.pause());
    }
    if (reportable != null) {
      latestError(reportable);
    }
    notifyUI();
  });
}

function getOffsets(
  params: SimpleConsumeMultiPartitionRequest,
  results: SimpleConsumeMultiPartitionResponse | null,
  partitions: number[] | null,
): SimpleConsumeMultiPartitionRequest {
  if (results?.partition_data_list != null) {
    const { max_poll_records, message_max_bytes, fetch_max_bytes } = params;
    const offsets = results.partition_data_list.reduce((list, { partition_id, next_offset }) => {
      return partitions == null || (partition_id != null && partitions.includes(partition_id))
        ? list.concat({ partition_id: partition_id, offset: next_offset })
        : list;
    }, [] as PartitionOffset[]);
    return { max_poll_records, message_max_bytes, fetch_max_bytes, offsets };
  }
  return params;
}

function trackMessageViewerAction(topic: KafkaTopic, details: { action: string }) {
  const augmentedDetails = {
    action: details.action,
    connection_type: topic.connectionType,
    connection_id: topic.connectionId,
    environment_id: topic.environmentId,
    cluster_id: topic.clusterId,
    topic_hash: hashed(topic.name),
  };

  logUsage(UserEvent.MessageViewerAction, augmentedDetails);
}

let debounceTimer: ReturnType<typeof setTimeout>;

function debouncedTrack(topic: KafkaTopic, details: { action: string }) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => trackMessageViewerAction(topic, details), 200);
}
