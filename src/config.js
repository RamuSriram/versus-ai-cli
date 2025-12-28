import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function configPaths() {
  const home = os.homedir();
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : path.join(home, ".config");
  return [
    path.join(base, "versus", "config.json"),
    path.join(home, ".versusrc.json"),
  ];
}

export async function loadUserConfig() {
  const paths = configPaths();
  for (const p of paths) {
    try {
      const raw = await fs.readFile(p, "utf8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object") return data;
    } catch (err) {
      if (err?.code === "ENOENT") continue;
      const e = new Error(`Failed to read config file: ${p}`);
      e.hint = "Fix the JSON syntax or delete the config file to use defaults.";
      throw e;
    }
  }
  return {};
}
