import test from "node:test";
import assert from "node:assert/strict";

import { formatRelativeTime } from "../src/util/time.js";

test("formatRelativeTime formats minutes and hours with rounding down", () => {
  const now = 1_000_000_000;

  assert.equal(formatRelativeTime(now - 3 * 60 * 1000, now), "3m ago");
  assert.equal(formatRelativeTime(now - 59 * 60 * 1000, now), "59m ago");
  assert.equal(formatRelativeTime(now - 2 * 60 * 60 * 1000, now), "2h ago");
});
