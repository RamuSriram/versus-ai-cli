import { Command } from "commander";
import { createRequire } from "module";

import { runComparison, buildComparisonPrompt } from "./engine.js";
import { runStatus } from "./status.js";
import { clearCache, getCacheInfo } from "./cache.js";
import { loadUserConfig } from "./config.js";
import { hasAnyFlag } from "./util/argv.js";
import { createSpinner } from "./util/spinner.js";
import { editText, pageText, writeTextFile } from "./util/view.js";
import { renderMarkdownToTerminal } from "./util/markdown.js";
import { formatLocalDateTime, formatLocalDateTimeShort, formatRelativeTime } from "./util/time.js";
import { pc, setColorMode } from "./util/style.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

function toInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFormat(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "rendered";
  if (v === "rendered" || v === "pretty" || v === "plain") return "rendered";
  if (v === "markdown" || v === "md" || v === "raw") return "markdown";
  if (v === "json") return "json";
  return v;
}

function normalizeOptions(raw, config, argv) {
  const defaults = {
    backend: "auto",
    model: undefined,
    level: "intermediate",
    mode: "summary",
    format: "rendered",
    cache: true,
    ttlHours: 720,
    maxDocChars: 6000,
    includeDocs: true,
    debug: false,
  };

  // Start with hard defaults, then config, then CLI overrides (only when explicitly provided)
  const merged = { ...defaults, ...(config || {}) };

  // Explicit CLI overrides (only if user actually typed the flag)
  if (hasAnyFlag(argv, ["-b", "--backend"])) merged.backend = raw.backend;
  if (hasAnyFlag(argv, ["-m", "--model"])) merged.model = raw.model;

  if (hasAnyFlag(argv, ["--level"])) merged.level = raw.level;
  if (hasAnyFlag(argv, ["--mode"])) merged.mode = raw.mode;
  if (hasAnyFlag(argv, ["--format"])) merged.format = normalizeFormat(raw.format);
  if (hasAnyFlag(argv, ["--raw"])) merged.format = "markdown";

  if (hasAnyFlag(argv, ["--ttl-hours"])) merged.ttlHours = toInt(raw.ttlHours, merged.ttlHours);
  if (hasAnyFlag(argv, ["--max-doc-chars"])) merged.maxDocChars = toInt(raw.maxDocChars, merged.maxDocChars);

  if (hasAnyFlag(argv, ["--no-cache"])) merged.cache = false;
  if (hasAnyFlag(argv, ["--no-docs"])) merged.includeDocs = false;

  if (hasAnyFlag(argv, ["-d", "--debug"])) merged.debug = true;

  // Normalize numeric types
  merged.ttlHours = toInt(merged.ttlHours, defaults.ttlHours);
  merged.maxDocChars = toInt(merged.maxDocChars, defaults.maxDocChars);

  merged.format = normalizeFormat(merged.format);

  return merged;
}

function printError(err) {
  const msg = err?.message || String(err);
  console.error(pc.red("Error:"), msg);
  if (err?.hint) console.error(pc.dim(err.hint));
  if (process.env.VERSUS_DEBUG_STACK === "1" && err?.stack) {
    console.error(pc.dim(err.stack));
  }
}

function printHeader(left, right) {
  const title = pc.bold(pc.cyan(`${left} vs ${right}`));
  console.log(title);
  console.log(pc.dim("─".repeat(Math.min(60, Math.max(10, title.length)))));
}

function shouldShowSpinner(options) {
  // Keep JSON output super clean.
  if (options.format === "json") return false;

  // Mock backend is basically instant; avoid flicker.
  if (options.backend === "mock") return false;

  return Boolean(process.stderr.isTTY);
}

function normalizeArgvForColor(args) {
  // Commander does not know about `--no-color` when `--color <mode>` is used.
  // We treat it as an alias for `--color=never`.
  return args.map((a) => (a === "--no-color" ? "--color=never" : a));
}

function extractColorMode(args) {
  // Last occurrence wins.
  for (let i = args.length - 1; i >= 0; i--) {
    const a = args[i];
    if (a === "--color" && i + 1 < args.length) return args[i + 1];
    if (a.startsWith("--color=")) return a.slice("--color=".length);
  }
  return "auto";
}

export async function main(argv) {
  const rawArgv = normalizeArgvForColor(argv.slice(2));
  setColorMode(extractColorMode(rawArgv));

  const program = new Command();
  const argvForCommander = [...argv.slice(0, 2), ...rawArgv];

  program
    .name("versus")
    .description("Compare two Linux commands or concepts using an LLM, grounded in local docs.")
    .version(pkg.version)
    .showHelpAfterError()
    .showSuggestionAfterError();

  program.addHelpText(
    "after",
    `\nExamples:\n  versus nano vim\n  versus curl wget --backend gemini\n  versus "git pull" "git fetch" --level beginner\n\nUseful commands:\n  versus status            # environment / backend checks (alias: doctor)\n  versus cache --clear     # clear cached responses\n  versus prompt nano vim   # view the full generated prompt in a pager\n\nOutput tips:\n  By default, versus renders Markdown for readability (TTY only).\n  Use --raw (or --format markdown) to print raw Markdown.\n  Control ANSI styling with --color auto|always|never (or set NO_COLOR=1).\n  Alias: --no-color is the same as --color=never.\n\nTip: flags can be passed as --backend gemini OR --backend=gemini.\n`
  );

  program
    .command("status")
    .alias("doctor")
    .description("Check environment (Node, man, cache path, and optional LLM backends).")
    .option("--color <mode>", "ANSI styling: auto|always|never", "auto")
    .option("--json", "output machine-readable JSON")
    .action(async (opts) => {
      try {
        const report = await runStatus();
        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }
        for (const line of report.human) console.log(line);
      } catch (err) {
        printError(err);
        process.exitCode = 1;
      }
    });

  program
    .command("cache")
    .description("Inspect or clear the local cache.")
    .option("--color <mode>", "ANSI styling: auto|always|never", "auto")
    .option("--clear", "delete all cache entries")
    .option("--json", "output machine-readable JSON")
    .action(async (opts) => {
      try {
        if (opts.clear) {
          const cleared = await clearCache();
          if (opts.json) {
            console.log(JSON.stringify({ cleared }, null, 2));
          } else {
            console.log(pc.green(`Cleared ${cleared} cache entr${cleared === 1 ? "y" : "ies"}.`));
          }
          return;
        }

        const info = await getCacheInfo();
        if (opts.json) {
          console.log(JSON.stringify(info, null, 2));
        } else {
          console.log(pc.bold("Cache"));
          console.log(`File: ${info.file}`);
          console.log(`Entries: ${info.entries}`);
          console.log(pc.dim("Tip: run `versus cache --clear` to delete all entries."));
        }
      } catch (err) {
        printError(err);
        process.exitCode = 1;
      }
    });

  program
    .command("prompt")
    .description("Generate the full LLM prompt for a comparison (no backend call).")
    .argument("<left>", "first command or concept")
    .argument("<right>", "second command or concept")
    .option("--color <mode>", "ANSI styling: auto|always|never", "auto")
    .option("--level <level>", "beginner|intermediate|advanced", "intermediate")
    .option("--mode <mode>", "summary|cheatsheet|table", "summary")
    .option("--max-doc-chars <n>", "max characters of local docs to include per side", "6000")
    .option("--no-docs", "do not read local docs")
    .option("--stdout", "print prompt to stdout instead of opening a pager/editor")
    .option("--editor", "open prompt in $EDITOR (fallback: nano)")
    .option("--output <file>", "write prompt to a file")
    .option("-d, --debug", "print debug metadata (doc sources, etc.)")
    .action(async (left, right, opts) => {
      const spinner = createSpinner({ text: "Building prompt" });
      try {
        const config = await loadUserConfig();
        const options = normalizeOptions(opts, config, rawArgv);

        const { prompt, leftInfo, rightInfo } = await buildComparisonPrompt(left, right, options);

        spinner.stop();

        if (opts.output) {
          await writeTextFile(opts.output, prompt);
        }

        if (opts.stdout) {
          process.stdout.write(prompt);
          if (!prompt.endsWith("\n")) process.stdout.write("\n");
        } else if (opts.editor) {
          await editText(prompt, {
            filePath: opts.output,
            keepFile: Boolean(opts.output),
          });
        } else {
          await pageText(prompt);
        }

        if (options.debug) {
          const meta = {
            sources: { left: leftInfo.sources, right: rightInfo.sources },
            skipped: { left: leftInfo.skipped, right: rightInfo.skipped },
          };
          console.error(pc.dim("\nDebug"));
          console.error(pc.dim(JSON.stringify(meta, null, 2)));
        }
      } catch (err) {
        spinner.stop();
        printError(err);
        process.exitCode = 1;
      }
    });

  program
    .argument("<left>", "first command or concept")
    .argument("<right>", "second command or concept")
    .option("--color <mode>", "ANSI styling: auto|always|never", "auto")
    .option("-b, --backend <backend>", "auto|openai|gemini|ollama|mock", "auto")
    .option("-m, --model <model>", "model name (provider-specific)")
    .option("--level <level>", "beginner|intermediate|advanced", "intermediate")
    .option("--mode <mode>", "summary|cheatsheet|table", "summary")
    .option("--format <format>", "rendered|markdown|json", "rendered")
    .option("--raw", "output raw Markdown (disable terminal rendering)")
    .option("--no-cache", "disable cache")
    .option("--ttl-hours <n>", "cache TTL in hours (default: 720 = 30 days)")
    .option("--max-doc-chars <n>", "max characters of local docs to include per side")
    .option("--no-docs", "do not read local docs (LLM general knowledge only)")
    .option("-d, --debug", "print debug metadata (timings, doc sources, cache)")
    .action(async (left, right, opts) => {
      let spinner = null;
      try {
        const config = await loadUserConfig();
        const options = normalizeOptions(opts, config, rawArgv);

        if (shouldShowSpinner(options)) spinner = createSpinner({ text: "Comparing" });

        // Status callback updates spinner text for real-time progress
        const onStatus = (msg) => {
          if (spinner) spinner.update(msg);
        };

        const result = await runComparison(left, right, options, onStatus);

        spinner?.stop();

        if (options.format === "json") {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        printHeader(left, right);

        // Small, helpful metadata (kept subtle).
        const backendLine = `Backend: ${result.backend}${result.model ? ` (model: ${result.model})` : ""}`;
        console.log(pc.dim(backendLine));

        if (result.cached) {
          if (result.createdAt) {
            const dt = new Date(result.createdAt);
            const nowMs = Date.now();
            const ageMs = Math.max(0, nowMs - dt.getTime());
            const rel = formatRelativeTime(dt.getTime(), nowMs);

            // UX rule: show relative age when it's recent (actionable), otherwise show local absolute time.
            // < 60m  => "Cached (3m ago)"
            // >= 60m => "Cached from Dec 28, 3:43 PM IST"
            if (ageMs < 60 * 60 * 1000) {
              console.log(pc.dim(`ℹ Cached (${rel}). Use --no-cache to refresh.`));
            } else {
              const localShort = formatLocalDateTimeShort(dt, new Date(nowMs));
              console.log(pc.dim(`ℹ Cached from ${localShort}. Use --no-cache to refresh.`));
            }

            if (options.debug) {
              const localFull = formatLocalDateTime(dt);
              console.log(pc.dim(`  (cache createdAt: local=${localFull}, relative=${rel}, utc/iso=${result.createdAt})`));
            }
          } else {
            console.log(pc.dim("ℹ Cached response. Use --no-cache to refresh."));
          }
        }

        console.log("");

        const raw = result.text.trim();
        let out = raw;

        const shouldRender = options.format === "rendered" && Boolean(process.stdout.isTTY);

        if (shouldRender) {
          try {
            out = renderMarkdownToTerminal(raw);
          } catch (e) {
            // Graceful fallback to raw markdown.
            out = raw;
            if (options.debug) {
              console.error(pc.dim("(markdown render failed; falling back to raw)"));
            }
          }
        }

        console.log(out);
        console.log("");

        if (options.debug) {
          console.log(pc.dim("Debug"));
          console.log(pc.dim(JSON.stringify(result.meta, null, 2)));
        }
      } catch (err) {
        spinner?.stop();
        printError(err);
        process.exitCode = 1;
      }
    });

  await program.parseAsync(argvForCommander);
}
