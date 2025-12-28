export async function generateOllama({ prompt, model, baseUrl }) {
  const urlBase = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const url = `${urlBase.replace(/\/$/, "")}/api/generate`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "llama3.2",
      prompt,
      stream: false,
    }),
  }).catch((e) => {
    const err = new Error(`Failed to reach Ollama at ${urlBase}`);
    err.hint = "Start Ollama and make sure the API is reachable on http://localhost:11434";
    throw err;
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Ollama error (${res.status}): ${body.slice(0, 200)}`);
    err.hint = "Check that the model is installed: ollama pull llama3.2";
    throw err;
  }

  const data = await res.json();
  const text = data?.response ?? "";
  return String(text).trim();
}
