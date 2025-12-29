import { generateOpenAI } from "./openai.js";
import { generateGemini } from "./gemini.js";
import { generateOllama } from "./ollama.js";
import { generateMock } from "./mock.js";
import { DEFAULT_MODELS } from "./defaults.js";

async function isOllamaUp(baseUrl) {
  const urlBase = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const url = `${urlBase.replace(/\/$/, "")}/api/version`;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateText({ backend, prompt, model }) {
  const want = backend || "auto";

  if (want === "auto") {
    if (hasOpenAIKey()) {
      const text = await generateOpenAI({ prompt, model });
      return { text, backendUsed: "openai", modelUsed: model || DEFAULT_MODELS.openai };
    }
    if (hasGeminiKey()) {
      const text = await generateGemini({ prompt, model });
      return { text, backendUsed: "gemini", modelUsed: model || DEFAULT_MODELS.gemini };
    }
    if (await isOllamaUp()) {
      const text = await generateOllama({ prompt, model });
      return { text, backendUsed: "ollama", modelUsed: model || DEFAULT_MODELS.ollama };
    }
    const text = await generateMock({ prompt });
    return { text, backendUsed: "mock", modelUsed: DEFAULT_MODELS.mock };
  }

  if (want === "openai") {
    const text = await generateOpenAI({ prompt, model });
    return { text, backendUsed: "openai", modelUsed: model || DEFAULT_MODELS.openai };
  }
  if (want === "gemini") {
    const text = await generateGemini({ prompt, model });
    return { text, backendUsed: "gemini", modelUsed: model || DEFAULT_MODELS.gemini };
  }
  if (want === "ollama") {
    const text = await generateOllama({ prompt, model });
    return { text, backendUsed: "ollama", modelUsed: model || DEFAULT_MODELS.ollama };
  }
  if (want === "mock") {
    const text = await generateMock({ prompt });
    return { text, backendUsed: "mock", modelUsed: DEFAULT_MODELS.mock };
  }

  const err = new Error(`Unknown backend: ${want}`);
  err.hint = "Use --backend auto|openai|gemini|ollama|mock";
  throw err;
}

