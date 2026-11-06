import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { linePosition } from "../../_js/modules/nowline.js";

// Rows starting at 0, 900 and 1800 seconds (15 minutes each), day ending at 2700
const TIMES = [0, 900, 1800];
const END = 2700;

describe("linePosition", () => {
  test("hidden before the first row and from the end of the day", () => {
    assert.equal(linePosition(TIMES, END, -1), null);
    assert.equal(linePosition(TIMES, END, END), null);
    assert.equal(linePosition([], END, 0), null);
  });

  test("moves through a row", () => {
    assert.deepEqual(linePosition(TIMES, END, 0), { index: 0, fraction: 0 });
    assert.deepEqual(linePosition(TIMES, END, 1350), { index: 1, fraction: 0.5 });
  });

  test("starts the next row at its start", () => {
    assert.deepEqual(linePosition(TIMES, END, 900), { index: 1, fraction: 0 });
  });

  test("last row ends with the day", () => {
    assert.deepEqual(linePosition(TIMES, END, 2250), { index: 2, fraction: 0.5 });
  });

  test("rows of different length, e.g. time_steps: start", () => {
    assert.deepEqual(linePosition([0, 1800, 7200], 9000, 4500), { index: 1, fraction: 0.5 });
  });
});
