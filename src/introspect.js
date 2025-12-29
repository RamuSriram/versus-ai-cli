import { spawn } from "node:child_process";

import { validateTargetForExec } from "./util/sanitize.js";
import { normalizeText, truncate } from "./util/text.js";

const DEFAULT_TIMEOUT_MS = 1200;

function blockedBecausePrivilege(tokens) {
  const first = tokens[0];
  return first === "sudo" || first === "su" || first === "doas";
}

function runCommand(cmd, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Make man output less "paged" and less fancy.
        MANPAGER: "cat",
        PAGER: "cat",
        LESS: "FRX",
      },
    });

    let stdout = "";
    let stderr = "";
    let done = false;

    const killTimer =
      timeoutMs && timeoutMs > 0
        ? setTimeout(() => {
          if (done) return;
          done = true;
          try {
            child.kill("SIGKILL");
          } catch { }
          resolve({ ok: false, stdout, stderr, timedOut: true });
        }, timeoutMs)
        : null;

    child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf8")));

    child.on("error", () => {
      if (done) return;
      done = true;
      if (killTimer) clearTimeout(killTimer);
      resolve({ ok: false, stdout: "", stderr: "", error: true });
    });

    child.on("close", (code) => {
      if (done) return;
      done = true;
      if (killTimer) clearTimeout(killTimer);
      resolve({ ok: code === 0, stdout, stderr, code });
    });
  });
}

async function tryAddSource(sources, kind, cmd, args, maxCharsPerSource) {
  const res = await runCommand(cmd, args);
  const cleaned = normalizeText(res.stdout);
  if (!cleaned) return;
  sources.push({
    kind,
    cmd,
    args,
    chars: cleaned.length,
    snippet: cleaned.slice(0, 80),
  });
  return truncate(cleaned, maxCharsPerSource);
}

export async function collectDocs(target, { maxChars = 6000, debug = false } = {}) {
  const validated = validateTargetForExec(target);
  if (!validated.ok) {
    return {
      docs: "",
      sources: [],
      skipped: validated.reason,
    };
  }

  const tokens = validated.tokens;

  if (blockedBecausePrivilege(tokens)) {
    return {
      docs: "",
      sources: [],
      skipped: `Skipping local docs for safety (starts with '${tokens[0]}').`,
    };
  }

  // Split budget between sources. We'll aim for ~3 sources max, so maxChars/3 each.
  const maxPerSource = Math.max(800, Math.floor(maxChars / 3));

  const sources = [];
  const [cmd, ...rest] = tokens;

  const parts = [];

  // Always try man for the base command first.
  const manBase = await tryAddSource(sources, "man", "man", ["-P", "cat", cmd], maxPerSource);
  if (manBase) parts.push(`## man ${cmd}\n${manBase}`);

  // If we have a subcommand, try a man page like git-pull.
  if (rest.length >= 1) {
    const sub = rest[0];
    const manSub = await tryAddSource(
      sources,
      "man-subcommand",
      "man",
      ["-P", "cat", `${cmd}-${sub}`],
      maxPerSource
    );
    if (manSub) parts.push(`## man ${cmd}-${sub}\n${manSub}`);
  }

  // Try --help. For multi-token, we do: <cmd> <rest...> --help
  {
    const helpArgs = rest.length ? [...rest, "--help"] : ["--help"];
    const helpOut = await tryAddSource(sources, "--help", cmd, helpArgs, maxPerSource);
    if (helpOut) parts.push(`## ${cmd} ${helpArgs.join(" ")}\n${helpOut}`);
  }

  // Try info for base command (info doesn't do subcommands well usually).
  {
    const infoOut = await tryAddSource(sources, "info", "info", [cmd], maxPerSource);
    if (infoOut) parts.push(`## info ${cmd}\n${infoOut}`);
  }

  // Try bash builtin help (only makes sense for single tokens like 'cd', 'help', etc.)
  if (rest.length === 0) {
    const bashOut = await tryAddSource(
      sources,
      "bash-help",
      "bash",
      ["-lc", `help ${cmd}`],
      maxPerSource
    );
    if (bashOut) parts.push(`## bash help ${cmd}\n${bashOut}`);
  }

  // Heuristic: git help <subcommand>
  if (cmd === "git" && rest.length >= 1) {
    const sub = rest[0];
    const gitHelp = await tryAddSource(
      sources,
      "git-help",
      "git",
      ["help", sub],
      maxPerSource
    );
    if (gitHelp) parts.push(`## git help ${sub}\n${gitHelp}`);
  }

  const docs = parts.join("\n\n").trim();

  return {
    docs,
    sources: debug ? sources : sources.map(({ kind }) => ({ kind })),
    skipped: docs ? null : "No local docs found via man/--help/info/bash help.",
  };
}
