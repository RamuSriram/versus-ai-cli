#!/usr/bin/env node
import { main } from "../src/cli.js";

main(process.argv).catch((err) => {
  // Last-resort crash handler. Most errors are handled inside CLI.
  console.error(err?.stack || String(err));
  process.exit(1);
});
