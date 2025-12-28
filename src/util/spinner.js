// Tiny terminal spinner (animated dots) for long-running operations.
// Writes to stderr so stdout stays clean for piping.

export function createSpinner({ text = "Working", delayMs = 150, intervalMs = 120 } = {}) {
  // Only show when stderr is a real TTY.
  if (!process.stderr.isTTY) {
    return {
      update: () => {},
      stop: () => {},
    };
  }

  const frames = ["", ".", "..", "..."];
  let frameIdx = 0;
  let lastLen = 0;
  let interval = null;
  let started = false;

  const writeFrame = () => {
    const msg = `${text}${frames[frameIdx]}`;
    frameIdx = (frameIdx + 1) % frames.length;

    // Clear any leftover characters from longer previous frames.
    const pad = lastLen > msg.length ? " ".repeat(lastLen - msg.length) : "";
    lastLen = msg.length;
    process.stderr.write(`\r${msg}${pad}`);
  };

  const timer = setTimeout(() => {
    started = true;
    writeFrame();
    interval = setInterval(writeFrame, intervalMs);
  }, delayMs);

  return {
    update(nextText) {
      text = String(nextText ?? "");
    },
    stop() {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
      if (started) {
        process.stderr.write(`\r${" ".repeat(lastLen)}\r`);
      }
    },
  };
}
