import crypto from "node:crypto";

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function stripAnsi(text) {
  // Basic ANSI escape stripping
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

export function stripOverstrikes(text) {
  // man pages often use overstrike/backspace formatting: "H\bH" or "_\bX".
  // This removes any "char + backspace" sequences.
  // Example: "m\ban" -> "an" (approx).
  return text.replace(/.\x08/g, "");
}

export function normalizeText(text) {
  let t = String(text ?? "");
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = stripAnsi(t);
  t = stripOverstrikes(t);
  // Collapse absurd whitespace while keeping newlines.
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}

export function truncate(text, maxChars) {
  const t = String(text ?? "");
  if (!Number.isFinite(maxChars) || maxChars <= 0) return "";
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars) + "\n\n[...truncated...]\n";
}

/**
 * Truncate without chopping words in half (when possible).
 *
 * If we can't find a whitespace boundary (e.g. a very long token), we fall back
 * to a hard character cut.
 */
export function truncateAtWordBoundary(text, maxChars, { suffix = "\n\n[...truncated...]\n" } = {}) {
  const t = String(text ?? "");
  if (!Number.isFinite(maxChars) || maxChars <= 0) return "";
  if (t.length <= maxChars) return t;

  // Look for a whitespace boundary near the cut point.
  const window = t.slice(0, maxChars + 1);
  const lastWs = Math.max(
    window.lastIndexOf(" "),
    window.lastIndexOf("\n"),
    window.lastIndexOf("\t")
  );

  // If we found any whitespace boundary, prefer it to avoid chopping words.
  const cut = lastWs >= 0 ? lastWs : maxChars;

  return t.slice(0, cut).trimEnd() + suffix;
}

