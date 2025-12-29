import { DEFAULT_MODELS } from "./defaults.js";

export async function generateGemini({ prompt, model, apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error("GEMINI_API_KEY is not set.");
    err.hint = 'Export your API key: export GEMINI_API_KEY="..."';
    throw err;
  }

  const m = model || DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });
  } catch {
    const err = new Error("Failed to reach Gemini API (network error).");
    err.hint =
      "Check your internet connection and DNS.\n" +
      "If you're on WSL and see 'fetch failed', try:\n" +
      '  export NODE_OPTIONS="--dns-result-order=ipv4first"';
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      (typeof data === "string" ? data : "") ||
      `HTTP ${res.status}`;

    const err = new Error(`Gemini error: ${msg}`);
    err.hint =
      `Check that your model name is valid (e.g. ${m}) and that GEMINI_API_KEY is correct.`;
    throw err;
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text || "").join("") : "";

  return String(text).trim();
}
