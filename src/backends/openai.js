import OpenAI from "openai";
import { DEFAULT_MODELS } from "./defaults.js";

export async function generateOpenAI({ prompt, model, apiKey, baseUrl }) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    const err = new Error("OPENAI_API_KEY is not set.");
    err.hint = 'Export your API key: export OPENAI_API_KEY="..."';
    throw err;
  }

  const client = new OpenAI({
    apiKey: key,
    baseURL: baseUrl || process.env.OPENAI_BASE_URL,
  });

  try {
    const response = await client.responses.create({
      model: model || DEFAULT_MODELS.openai,
      input: prompt,
    });

    const text = response?.output_text ?? "";
    return String(text).trim();
  } catch (e) {
    const msg = e?.message || String(e);
    const err = new Error(`OpenAI request failed: ${msg}`);

    const lower = String(msg).toLowerCase();
    if (lower.includes("fetch failed")) {
      err.hint =
        "Check your internet connection and DNS.\n" +
        "If you're on WSL and see 'fetch failed', try:\n" +
        '  export NODE_OPTIONS="--dns-result-order=ipv4first"';
    } else if (lower.includes("401") || lower.includes("unauthorized")) {
      err.hint = "Check that OPENAI_API_KEY is valid.";
    }

    throw err;
  }
}
