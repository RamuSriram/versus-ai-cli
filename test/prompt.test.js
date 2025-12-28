import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "../src/prompt.js";

test("buildPrompt includes both labels and docs blocks", () => {
  const p = buildPrompt({
    left: "curl",
    right: "wget",
    leftDocs: "LEFTDOC",
    rightDocs: "RIGHTDOC",
    level: "beginner",
    mode: "summary",
  });

  assert.match(p, /Compare "curl" and "wget"/);
  assert.match(p, /--- DOCS: curl ---/);
  assert.match(p, /LEFTDOC/);
  assert.match(p, /--- DOCS: wget ---/);
  assert.match(p, /RIGHTDOC/);
});
