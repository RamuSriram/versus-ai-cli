import { spawn } from "node:child_process";
import { getCacheInfo } from "./cache.js";
import { pc } from "./util/style.js";

function run(cmd, args, { timeoutMs = 1200 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let done = false;

    const timer =
      timeoutMs && timeoutMs > 0
        ? setTimeout(() => {
            if (done) return;
            done = true;
            try {
              child.kill("SIGKILL");
            } catch {}
            resolve({ ok: false, stdout, timedOut: true });
          }, timeoutMs)
        : null;

    child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    child.on("error", () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve({ ok: false, stdout: "" });
    });
    child.on("close", (code) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve({ ok: code === 0, stdout });
    });
  });
}

async function checkMan() {
  // man can return non-zero on some systems depending on pager, so we just check it outputs something.
  const res = await run("man", ["-P", "cat", "ls"], { timeoutMs: 1500 });
  return Boolean(res.stdout && res.stdout.length > 20);
}

async function checkOllama() {
  const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const baseNoSlash = base.replace(/\/$/, "");
  const versionUrl = `${baseNoSlash}/api/version`;
  const tagsUrl = `${baseNoSlash}/api/tags`;

  try {
    const vRes = await fetch(versionUrl);
    if (!vRes.ok) return { ok: false, base, reason: `HTTP ${vRes.status}` };
    const v = await vRes.json().catch(() => ({}));

    const tRes = await fetch(tagsUrl);
    const tags = tRes.ok ? await tRes.json().catch(() => ({})) : {};
    const models = Array.isArray(tags?.models)
      ? tags.models.map((m) => m.name).slice(0, 10)
      : [];

    return { ok: true, base, version: v?.version, models };
  } catch (e) {
    return { ok: false, base, reason: "not reachable" };
  }
}

export async function runStatus() {
  const node = process.versions.node;
  const major = Number(node.split(".")[0] || 0);
  const nodeOk = major >= 20;

  const manOk = await checkMan().catch(() => false);
  const cacheInfo = await getCacheInfo();

  const openaiKey = Boolean(process.env.OPENAI_API_KEY);
  const geminiKey = Boolean(process.env.GEMINI_API_KEY);
  const ollama = await checkOllama();

  const ok = nodeOk && manOk;

  const human = [];
  human.push(pc.bold("versus status"));
  human.push("");

  human.push(`${nodeOk ? pc.green("✔") : pc.red("✖")} Node.js ${node} (need 20+)`);
  human.push(`${manOk ? pc.green("✔") : pc.red("✖")} man pages available`);

  human.push(`${pc.green("ℹ")} Cache file: ${cacheInfo.file}`);
  human.push(`${pc.green("ℹ")} Cache entries: ${cacheInfo.entries}`);
  human.push("");

  human.push(pc.bold("Backends"));
  human.push(`${openaiKey ? pc.green("✔") : pc.yellow("•")} OpenAI key ${openaiKey ? "set" : "not set"} (OPENAI_API_KEY)`);
  human.push(`${geminiKey ? pc.green("✔") : pc.yellow("•")} Gemini key ${geminiKey ? "set" : "not set"} (GEMINI_API_KEY)`);
  if (ollama.ok) {
    const models = ollama.models?.length ? `models: ${ollama.models.join(", ")}` : "no models found (try: ollama pull llama3.2)";
    human.push(`${pc.green("✔")} Ollama reachable at ${ollama.base} (${models})`);
  } else {
    human.push(`${pc.yellow("•")} Ollama not reachable at ${ollama.base}`);
  }

  human.push("");
  human.push(pc.dim("Tip: set OPENAI_API_KEY or GEMINI_API_KEY, or run Ollama locally to get real answers."));

  return {
    ok,
    checks: {
      node: { ok: nodeOk, version: node, required: ">=20" },
      man: { ok: manOk },
      cache: cacheInfo,
      backends: {
        openai: { ok: openaiKey },
        gemini: { ok: geminiKey },
        ollama,
      },
    },
    human,
  };
}


// Backwards-compatible alias (older docs used `doctor`).
export const runDoctor = runStatus;
