import test from "node:test";
import assert from "node:assert/strict";
import { hasAnyFlag } from "../src/util/argv.js";

test("hasAnyFlag detects both --flag value and --flag=value", () => {
  const argv = ["nano", "vim", "--backend=gemini", "--ttl-hours=24", "-d"];

  assert.equal(hasAnyFlag(argv, ["--backend"]), true);
  assert.equal(hasAnyFlag(argv, ["--ttl-hours"]), true);
  assert.equal(hasAnyFlag(argv, ["-d", "--debug"]), true);
  assert.equal(hasAnyFlag(argv, ["--no-cache"]), false);
});
