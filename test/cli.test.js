import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, "..", "bin", "versus.js");

function runCLI(args, { timeout = 5000 } = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [binPath, ...args], {
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, NO_COLOR: "1" },
        });

        let stdout = "";
        let stderr = "";
        let done = false;

        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            try {
                child.kill("SIGKILL");
            } catch { }
            resolve({ stdout, stderr, code: null, timedOut: true });
        }, timeout);

        child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
        child.stderr.on("data", (d) => (stderr += d.toString("utf8")));

        child.on("close", (code) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve({ stdout, stderr, code, timedOut: false });
        });

        child.on("error", () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve({ stdout, stderr, code: 1, timedOut: false });
        });
    });
}

test("CLI --help exits 0 and shows usage", async () => {
    const { stdout, code } = await runCLI(["--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /versus/i);
    assert.match(stdout, /Compare/i);
});

test("CLI --version exits 0 and shows version", async () => {
    const { stdout, code } = await runCLI(["--version"]);
    assert.equal(code, 0);
    assert.match(stdout, /\d+\.\d+\.\d+/);
});

test("CLI runs comparison with mock backend", async () => {
    const { stdout, code } = await runCLI(["curl", "wget", "--backend", "mock", "--no-cache"]);
    assert.equal(code, 0);
    assert.match(stdout, /curl vs wget/i);
    assert.match(stdout, /mock/i);
});

test("CLI status command exits 0", async () => {
    const { code } = await runCLI(["status"]);
    assert.equal(code, 0);
});

test("CLI cache command exits 0", async () => {
    const { code } = await runCLI(["cache"]);
    assert.equal(code, 0);
});
