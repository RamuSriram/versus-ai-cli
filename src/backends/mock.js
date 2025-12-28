import { truncateAtWordBoundary } from "../util/text.js";

export async function generateMock({ prompt }) {
  const maxPreviewChars = 900;
  const preview = truncateAtWordBoundary(prompt, maxPreviewChars);
  const wasTruncated = String(prompt ?? "").length > maxPreviewChars;

  return [
    "Mock backend selected.",
    "",
    "Set one of:",
    "- OPENAI_API_KEY (and use --backend=openai)",
    "- GEMINI_API_KEY (and use --backend=gemini)",
    "- Install Ollama (and use --backend=ollama)",
    "",
    `Prompt preview${wasTruncated ? " (truncated)" : ""}:`,
    preview,
    "",
    "Tip: view the full prompt with:",
    "  versus prompt <left> <right>          # opens in a pager",
    "  versus prompt --stdout <left> <right> # print to stdout",
  ].join("\n");
}
