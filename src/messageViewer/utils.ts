import { Data } from "dataclass";
import {
  type PartitionConsumeRecord,
  type SimpleConsumeMultiPartitionRequest,
} from "../clients/sidecar";
import { BitSet } from "../stream/stream";

const DEFAULT_MAX_POLL_RECORDS = 500;

const DEFAULT_CONSUME_PARAMS = {
  max_poll_records: DEFAULT_MAX_POLL_RECORDS,
  message_max_bytes: 1 * 1024 * 1024,
  fetch_max_bytes: 40 * 1024 * 1024,
};

/**
 * Basic timer structure with pause/resume functionality.
 * Uses `Date.now()` for time tracking.
 */
export class Timer extends Data {
  start = Date.now();
  offset = 0;

  pause(this: Timer) {
    const now = Date.now();
    return this.copy({ start: now, offset: now - this.start + this.offset });
  }

  resume(this: Timer) {
    return this.copy({ start: Date.now() });
  }

  reset(this: Timer) {
    return this.copy({ start: Date.now(), offset: 0 });
  }
}

/**
 * Define basic consume params based on desired consume mode.
 */
export function getConsumeParams(
  mode: "beginning" | "latest" | "timestamp",
  timestamp: number | undefined,
  max_poll_records: number,
): SimpleConsumeMultiPartitionRequest {
  return mode === "beginning"
    ? { ...DEFAULT_CONSUME_PARAMS, max_poll_records, from_beginning: true }
    : mode === "timestamp"
      ? { ...DEFAULT_CONSUME_PARAMS, max_poll_records, timestamp }
      : { ...DEFAULT_CONSUME_PARAMS, max_poll_records };
}

/**
 * Creates text filter parameters for message searching
 */
export function getTextFilterParams(query: string, capacity: number) {
  const bitset = new BitSet(capacity);
  const escaped = query
    .trim()
    // escape characters used by regexp itself
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // 1. make existing whitespaces in query optional
    // 2. add optional whitespaces at word boundaries
    .replace(/\s+|\b/g, "\\s*");
  const regexp = new RegExp(escaped, "i");
  return { bitset, regexp, query };
}

/**
 * Compress any valid json value into smaller payload for preview purpose.
 */
export function truncateValue(value: any): any {
  if (value == null) return null;
  if (typeof value === "object") {
    value = JSON.stringify(value, null, " ");
  }
  if (typeof value === "string" && value.length > 1024) {
    return value.slice(0, 256) + " ... " + value.slice(-256);
  }
  return value;
}

/**
 * Prepare message for display/preview
 */
export function prepareMessage(
  message: PartitionConsumeRecord,
  keySerialized: boolean,
  valueSerialized: boolean,
) {
  let key, value;

  try {
    key = keySerialized ? JSON.parse(message.key as any) : message.key;
  } catch {
    key = message.key;
  }

  try {
    value = valueSerialized ? JSON.parse(message.value as any) : message.value;
  } catch {
    value = message.value;
  }

  const { partition_id, offset, timestamp, headers, metadata } = message;
  return { partition_id, offset, timestamp, headers, key, value, metadata };
}

export { DEFAULT_MAX_POLL_RECORDS, DEFAULT_CONSUME_PARAMS };
