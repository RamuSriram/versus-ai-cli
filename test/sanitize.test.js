import test from "node:test";
import assert from "node:assert/strict";
import { validateTargetForExec } from "../src/util/sanitize.js";

test("validateTargetForExec accepts common commands", () => {
  assert.equal(validateTargetForExec("curl").ok, true);
  assert.equal(validateTargetForExec("git fetch").ok, true);
  assert.equal(validateTargetForExec("docker compose up").ok, true);
  assert.equal(validateTargetForExec("python3.12").ok, true);
});

test("validateTargetForExec rejects shell injection chars", () => {
  assert.equal(validateTargetForExec("ls; rm -rf /").ok, false);
  assert.equal(validateTargetForExec("$(whoami)").ok, false);
  assert.equal(validateTargetForExec("cat /etc/passwd").ok, false); // contains '/'
});
