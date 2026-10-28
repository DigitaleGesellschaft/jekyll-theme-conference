import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatDate, formatTime, toTimestamp } from "../../_js/core/time.js";

const ZURICH = "Europe/Zurich";

// Epoch seconds of a UTC date (month is 1-based)
const utc = (year, month, day, hour, min = 0) => Date.UTC(year, month - 1, day, hour, min) / 1000;

describe("formatDate / formatTime", () => {
  test("use the conference timezone after local midnight", () => {
    const ts = utc(2026, 2, 20, 23, 30);

    assert.equal(formatDate(ts, ZURICH), "2026-02-21");
    assert.equal(formatTime(ts, ZURICH), "2026-02-21 00:30");
  });

  test("respect daylight saving time", () => {
    assert.equal(formatTime(utc(2026, 7, 1, 10), ZURICH), "2026-07-01 12:00");
  });
});

describe("toTimestamp", () => {
  test("converts wall-clock time in winter and summer", () => {
    assert.equal(toTimestamp("2026-02-21", "00:30", ZURICH), utc(2026, 2, 20, 23, 30));
    assert.equal(toTimestamp("2026-07-01", "12:00", ZURICH), utc(2026, 7, 1, 10));
    assert.equal(toTimestamp("2026-07-01", "12:00", "America/New_York"), utc(2026, 7, 1, 16));
  });

  test("round-trips with formatTime", () => {
    const ts = toTimestamp("2026-10-25", "18:15", ZURICH);

    assert.equal(formatTime(ts, ZURICH), "2026-10-25 18:15");
  });
});
