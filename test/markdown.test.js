import test from "node:test";
import assert from "node:assert/strict";

import { renderMarkdownToTerminal } from "../src/util/markdown.js";
import { stripAnsi } from "../src/util/text.js";

test("renderMarkdownToTerminal renders headings without markdown markers", () => {
  const out = renderMarkdownToTerminal("# Title");
  assert.equal(stripAnsi(out).trim(), "Title");
});

test("renderMarkdownToTerminal renders bold without ** markers", () => {
  const out = renderMarkdownToTerminal("This is **bold**.");
  const plain = stripAnsi(out);
  assert.match(plain, /This is bold\./);
  assert.equal(plain.includes("**"), false);
});

test("renderMarkdownToTerminal renders a simple markdown table", () => {
  const md = [
    "| Feature | nano | vim |",
    "| --- | --- | --- |",
    "| Mode | modeless | modal |",
  ].join("\n");

  const out = stripAnsi(renderMarkdownToTerminal(md));
  // We don't assert exact layout, just that it becomes an ASCII table.
  assert.match(out, /\+[-+]+\+/);
  assert.match(out, /Feature/);
  assert.match(out, /nano/);
  assert.match(out, /vim/);
});
