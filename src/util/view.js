import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function shQuote(s) {
  // Minimal POSIX shell quoting.
  const str = String(s ?? "");
  return `'${str.replace(/'/g, `'"'"'`)}'`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeTextFile(filePath, text) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, String(text ?? ""), "utf8");
}

export async function pageText(text, { pager } = {}) {
  const t = String(text ?? "");

  // If we're not in an interactive terminal, just print.
  if (!process.stdout.isTTY) {
    process.stdout.write(t);
    if (!t.endsWith("\n")) process.stdout.write("\n");
    return { ok: true, mode: "stdout" };
  }

  const cmd = pager || process.env.PAGER || "less -R";

  const run = (command) =>
    new Promise((resolve) => {
      const child = spawn(command, {
        shell: true,
        stdio: ["pipe", "inherit", "inherit"],
      });

      child.on("error", () => resolve(false));
      child.on("close", () => resolve(true));

      try {
        child.stdin.write(t);
        if (!t.endsWith("\n")) child.stdin.write("\n");
        child.stdin.end();
      } catch {
        resolve(false);
      }
    });

  const ok = await run(cmd);
  if (ok) return { ok: true, mode: "pager", pager: cmd };

  // Fallback to `more` if `less` isn't available.
  const okMore = await run("more");
  if (okMore) return { ok: true, mode: "pager", pager: "more" };

  // Final fallback: stdout.
  process.stdout.write(t);
  if (!t.endsWith("\n")) process.stdout.write("\n");
  return { ok: false, mode: "stdout" };
}

export async function editText(text, { editor, filePath, keepFile = false } = {}) {
  const t = String(text ?? "");

  // Non-interactive: can't open an editor.
  if (!process.stdout.isTTY) {
    process.stdout.write(t);
    if (!t.endsWith("\n")) process.stdout.write("\n");
    return { ok: true, mode: "stdout" };
  }

  const editorCmd = editor || process.env.EDITOR || process.env.VISUAL || "nano";

  let temp = false;
  let fp = filePath;
  if (!fp) {
    temp = true;
    fp = path.join(os.tmpdir(), `versus-prompt-${process.pid}-${Date.now()}.txt`);
  }

  await writeTextFile(fp, t);

  const cmd = `${editorCmd} ${shQuote(fp)}`;

  const ok = await new Promise((resolve) => {
    const child = spawn(cmd, {
      shell: true,
      stdio: "inherit",
    });
    child.on("error", () => resolve(false));
    child.on("close", () => resolve(true));
  });

  if (temp && !keepFile) {
    try {
      await fs.rm(fp, { force: true });
    } catch {
      // ignore
    }
  }

  return { ok, mode: "editor", file: fp, editor: editorCmd };
}
