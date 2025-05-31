import { Data } from "dataclass";

const DEFAULT_RECORDS_CAPACITY = 100_000;

/**
 * Represents static snapshot of message viewer state that can be serialized.
 * Provides static method to deserialize the snapshot from a URI's query.
 */
export class MessageViewerConfig extends Data {
  consumeMode: "beginning" | "latest" | "timestamp" = "beginning";
  consumeTimestamp: number | null = null;
  partitionConsumed: number[] | null = null;
  messageLimit: number = DEFAULT_RECORDS_CAPACITY;
  partitionFilter: number[] | null = null;
  timestampFilter: [number, number] | null = null;
  textFilter: string | null = null;

  static fromQuery(params: URLSearchParams): MessageViewerConfig {
    let value: string | null;
    let config: Partial<MessageViewerConfig> = {};

    value = params.get("consumeMode");
    if (value != null && ["beginning", "latest", "timestamp"].includes(value)) {
      config.consumeMode = value as "beginning" | "latest" | "timestamp";
    }

    value = params.get("consumeTimestamp");
    if (value != null) {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        config.consumeTimestamp = parsed;
      }
    }

    value = params.get("partitionConsumed");
    if (value != null) {
      try {
        const parsed = JSON.parse(`[${value}]`) as unknown[];
        if (parsed.every((v): v is number => typeof v === "number")) {
          config.partitionConsumed = parsed;
        }
      } catch {
        // do nothing, fallback to default
      }
    }

    value = params.get("messageLimit");
    if (value != null) {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed) && [1_000_000, 100_000, 10_000, 1_000, 100].includes(parsed)) {
        config.messageLimit = parsed;
      }
    }

    value = params.get("partitionFilter");
    if (value != null) {
      try {
        const parsed = JSON.parse(`[${value}]`) as unknown[];
        if (parsed.every((v): v is number => typeof v === "number")) {
          config.partitionFilter = parsed;
        }
      } catch {
        // do nothing, fallback to default
      }
    }

    value = params.get("timestampFilter");
    if (value != null) {
      try {
        const parsed = JSON.parse(`[${value}]`) as unknown[];
        if (parsed.length === 2 && parsed.every((v): v is number => typeof v === "number")) {
          config.timestampFilter = parsed as [number, number];
        }
      } catch {
        // do nothing, fallback to default
      }
    }

    value = params.get("textFilter");
    if (value != null) {
      config.textFilter = value;
    }

    return MessageViewerConfig.create(config);
  }

  toQuery(): URLSearchParams {
    const params = new URLSearchParams();

    for (let key in this) {
      const value = this[key];
      if (value != null) {
        params.set(key, value.toString());
      }
    }

    return params;
  }
}
