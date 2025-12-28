import test from "node:test";
import assert from "node:assert/strict";
import { truncateAtWordBoundary } from "../src/util/text.js";

test("truncateAtWordBoundary does not chop a normal word in half", () => {
  const text = "hello world this is a test";
  const out = truncateAtWordBoundary(text, 10, { suffix: "" });
  // 10 chars would cut "world" in the middle; word-boundary cut should end at "hello".
  assert.equal(out, "hello");
});

test("truncateAtWordBoundary falls back to hard cut when no whitespace is available", () => {
  const text = "supercalifragilisticexpialidocious";
  const out = truncateAtWordBoundary(text, 5, { suffix: "" });
  assert.equal(out, "super");
});
