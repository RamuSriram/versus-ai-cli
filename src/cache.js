import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function cacheFilePath() {
  const home = os.homedir();
  const xdg = process.env.XDG_CACHE_HOME;
  const base = xdg ? xdg : path.join(home, ".cache");
  return path.join(base, "versus", "cache.json");
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readCache() {
  const file = cacheFilePath();
  try {
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return { version: 1, entries: {} };
    if (!data.entries || typeof data.entries !== "object") data.entries = {};
    return data;
  } catch (err) {
    if (err?.code === "ENOENT") return { version: 1, entries: {} };
    // If corrupted, keep a backup and start fresh.
    if (err instanceof SyntaxError) {
      const backup = file + ".corrupt";
      try {
        await fs.rename(file, backup);
      } catch {}
      return { version: 1, entries: {} };
    }
    throw err;
  }
}

async function writeCache(data) {
  const file = cacheFilePath();
  const dir = path.dirname(file);
  await ensureDir(dir);
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export async function getCacheInfo() {
  const file = cacheFilePath();
  const data = await readCache();
  const entries = Object.keys(data.entries || {}).length;
  return { file, entries };
}

export async function cacheGet(key) {
  const data = await readCache();
  const entry = data.entries?.[key];
  if (!entry) return null;

  if (entry.expiresAt) {
    const exp = Date.parse(entry.expiresAt);
    if (Number.isFinite(exp) && Date.now() > exp) {
      // expired: delete
      delete data.entries[key];
      await writeCache(data);
      return null;
    }
  }

  return entry;
}

export async function cacheSet(key, entry) {
  const data = await readCache();
  data.entries[key] = entry;
  await writeCache(data);
}

export async function clearCache() {
  const data = await readCache();
  const count = Object.keys(data.entries || {}).length;
  data.entries = {};
  await writeCache(data);
  return count;
}
