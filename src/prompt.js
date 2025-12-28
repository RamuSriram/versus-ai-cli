export function buildPrompt({
  left,
  right,
  leftDocs,
  rightDocs,
  level = "intermediate",
  mode = "summary",
}) {
  const audience =
    level === "beginner"
      ? "Beginner (use simple language, minimal jargon, short explanations)."
      : level === "advanced"
        ? "Advanced (assume Linux comfort; include nuanced tradeoffs/perf details when relevant)."
        : "Intermediate (developer-friendly; explain jargon once).";

  const modeGuide =
    mode === "cheatsheet"
      ? "Include practical flags and a few example commands. Keep it under ~450 words."
      : mode === "table"
        ? "Prioritize a clear comparison table (4–8 rows) and keep other text short."
        : "Keep it concise (under ~250 words).";

  const docsNote =
    leftDocs?.trim() || rightDocs?.trim()
      ? "Use the provided docs as the most reliable source. If the docs are missing or unclear, say so and then use general knowledge."
      : "No docs were provided; use general knowledge, but be explicit that you are not grounded in local docs.";

  return [
    "You are a Linux expert and a careful technical writer.",
    "",
    `Task: Compare "${left}" and "${right}" for a developer.`,
    `Audience: ${audience}`,
    `Mode: ${mode}. ${modeGuide}`,
    "",
    "Output format: Markdown.",
    "Rules:",
    `- ${docsNote}`,
    "- Do NOT invent flags that look plausible. If you are unsure, say you are unsure.",
    "- Avoid fluff. Be helpful and specific.",
    "",
    "Required structure:",
    "1) One-line verdict",
    "2) Short overview",
    `3) When to use ${left}`,
    `4) When to use ${right}`,
    "5) Key differences table",
    "6) Examples (2–3 per side) if you can do so safely",
    "7) Common mistakes / gotchas",
    "",
    `--- DOCS: ${left} ---`,
    leftDocs?.trim() ? leftDocs.trim() : "[no local docs found]",
    "",
    `--- DOCS: ${right} ---`,
    rightDocs?.trim() ? rightDocs.trim() : "[no local docs found]",
    "",
  ].join("\n");
}
