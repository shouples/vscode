import * as assert from "assert";
import "mocha";
import { datetimeLocalToTimestamp, timestampToDatetimeLocal } from "./message-viewer";

describe("MessageViewer datetime conversion utilities", () => {
  describe("timestampToDatetimeLocal", () => {
    it("should convert epoch milliseconds to datetime-local format", () => {
      // Test with a specific timestamp: 2024-01-01 12:30:45.123 UTC
      const timestamp = 1704110245123;
      const result = timestampToDatetimeLocal(timestamp);

      // The result should be in local timezone, but we can at least check the format
      assert.strictEqual(typeof result, "string", "Result should be a string");
      assert.match(
        result,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
        "Result should match YYYY-MM-DDTHH:mm:ss.sss format",
      );
    });

    it("should handle Date constructor edge cases", () => {
      // Test with Unix epoch
      const epochTimestamp = 0;
      const result = timestampToDatetimeLocal(epochTimestamp);
      assert.strictEqual(typeof result, "string", "Should handle epoch timestamp");
      assert.match(
        result,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
        "Should produce valid format for epoch",
      );
    });

    it("should pad single digits correctly", () => {
      // Test with a timestamp that has single digit month, day, hour, minute, second
      // February 3rd, 2024 at 01:02:03.004
      const timestamp = new Date(2024, 1, 3, 1, 2, 3, 4).getTime();
      const result = timestampToDatetimeLocal(timestamp);

      // Should contain properly padded values
      assert.match(result, /2024-02-03T01:02:03\.004/, "Should pad single digits with zeros");
    });
  });

  describe("datetimeLocalToTimestamp", () => {
    it("should convert datetime-local format to epoch milliseconds", () => {
      const datetimeLocal = "2024-01-01T12:30:45.123";
      const result = datetimeLocalToTimestamp(datetimeLocal);

      assert.strictEqual(typeof result, "number", "Result should be a number");
      assert.strictEqual(result > 0, true, "Result should be positive");
    });

    it("should handle datetime without milliseconds", () => {
      const datetimeLocal = "2024-01-01T12:30:45";
      const result = datetimeLocalToTimestamp(datetimeLocal);

      assert.strictEqual(typeof result, "number", "Should handle format without milliseconds");
      assert.strictEqual(result > 0, true, "Should produce valid timestamp");
    });

    it("should handle minimum datetime values", () => {
      const datetimeLocal = "1970-01-01T00:00:00.000";
      const result = datetimeLocalToTimestamp(datetimeLocal);

      // This will be timezone-dependent, but should be close to 0 for UTC
      assert.strictEqual(typeof result, "number", "Should handle epoch-like values");
    });
  });

  describe("round-trip conversion", () => {
    it("should maintain precision in round-trip conversion", () => {
      const originalTimestamp = Date.now();

      // Convert to datetime-local and back
      const datetimeLocal = timestampToDatetimeLocal(originalTimestamp);
      const roundTripTimestamp = datetimeLocalToTimestamp(datetimeLocal);

      assert.strictEqual(
        roundTripTimestamp,
        originalTimestamp,
        "Round-trip conversion should maintain exact precision",
      );
    });

    it("should handle multiple round-trip conversions", () => {
      const testTimestamps = [
        0, // epoch
        Date.now(), // current time
        1704067200000, // 2024-01-01 00:00:00 UTC
        1735689600000, // 2025-01-01 00:00:00 UTC
      ];

      testTimestamps.forEach((timestamp) => {
        const datetimeLocal = timestampToDatetimeLocal(timestamp);
        const roundTrip = datetimeLocalToTimestamp(datetimeLocal);

        assert.strictEqual(roundTrip, timestamp, `Round-trip failed for timestamp ${timestamp}`);
      });
    });
  });

  describe("format validation", () => {
    it("should produce valid datetime-local format for various timestamps", () => {
      const testCases = [
        { timestamp: 0, description: "epoch" },
        { timestamp: 946684800000, description: "Y2K" },
        { timestamp: 1704067200000, description: "2024-01-01" },
        { timestamp: Date.now(), description: "current time" },
      ];

      testCases.forEach(({ timestamp, description }) => {
        const result = timestampToDatetimeLocal(timestamp);
        assert.match(
          result,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
          `Should produce valid format for ${description}`,
        );

        // Verify it can be parsed back
        const parsed = datetimeLocalToTimestamp(result);
        assert.strictEqual(parsed, timestamp, `Should parse back correctly for ${description}`);
      });
    });

    it("should handle edge case dates", () => {
      // Test leap year (e.g. Feb 29, 2024)
      const leapYearDate = new Date(2024, 1, 29, 12, 0, 0, 0).getTime();
      const formatted = timestampToDatetimeLocal(leapYearDate);
      assert.match(formatted, /2024-02-29T12:00:00\.000/, "Should handle leap year correctly");

      // Test end of year (e.g. Dec 31, 2024)
      const endOfYear = new Date(2024, 11, 31, 23, 59, 59, 999).getTime();
      const formattedEOY = timestampToDatetimeLocal(endOfYear);
      assert.match(formattedEOY, /2024-12-31T23:59:59\.999/, "Should handle end of year correctly");
    });
  });
});
