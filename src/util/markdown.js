import { pc } from "./style.js";

import { stripAnsi } from "./text.js";

// IMPORTANT: do not capture styling functions at module load time.
// `pc` is a live binding that can be reconfigured at runtime (e.g. `--color never`).
const IDENTITY = (s) => s;
const style = (name) => (s) => (typeof pc?.[name] === "function" ? pc[name](s) : IDENTITY(s));

const bold = style("bold");
const dim = style("dim");
const underline = style("underline");
const italic = style("italic");
const cyan = style("cyan");

// Inline code should be readable but not visually loud across themes.
// Avoid inverse/background blocks (they can look harsh on dark themes).
const codeSpan = (s) => dim(underline(s));

function padAnsiRight(text, width) {
  const len = stripAnsi(text).length;
  if (len >= width) return text;
  return text + " ".repeat(width - len);
}

function parseTableRow(line) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

function isTableSeparator(line) {
  const t = line.trim();
  if (!t.includes("|")) return false;
  // Separator is mostly pipes, dashes, colons and spaces.
  return /^[|:\-\s]+$/.test(t) && t.includes("-");
}

function renderInline(text) {
  const input = String(text ?? "");

  // Code spans: split on backticks and style odd segments.
  const parts = input.split("`");
  const out = parts.map((seg, idx) => {
    if (idx % 2 === 1) return codeSpan(seg);

    let s = seg;

    // Links: [text](url) -> underlined text (keep url in dim parens)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
      const cleanLabel = String(label);
      const cleanUrl = String(url);
      return `${underline(cleanLabel)}${dim(` (${cleanUrl})`)}`;
    });

    // Bold: **text** or __text__
    s = s.replace(/(\*\*|__)(.+?)\1/g, (_m, _d, inner) => bold(inner));

    // Italic-ish: *text* or _text_ (avoid matching inside words too aggressively)
    s = s.replace(/(^|[^\w])(\*|_)([^*_]+?)\2([^\w]|$)/g, (_m, pre, _d, inner, post) => {
      // Many terminals render italics inconsistently. Underline is the safest emphasis.
      return `${pre}${underline(inner)}${post}`;
    });

    return s;
  });

  return out.join("");
}

function renderTable(lines, startIdx) {
  const header = parseTableRow(lines[startIdx]);
  const rows = [header];

  let i = startIdx + 2; // skip header + separator
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (!line.includes("|")) break;
    rows.push(parseTableRow(line));
    i++;
  }

  const cols = Math.max(...rows.map((r) => r.length));
  for (const r of rows) {
    while (r.length < cols) r.push("");
  }

  // Pre-render cells so we can measure visible widths.
  const rendered = rows.map((r, rowIdx) =>
    r.map((c) => {
      const cell = renderInline(c);
      return rowIdx === 0 ? bold(cell) : cell;
    })
  );

  const widths = new Array(cols).fill(0);
  for (const r of rendered) {
    r.forEach((cell, idx) => {
      const w = stripAnsi(cell).length;
      if (w > widths[idx]) widths[idx] = w;
    });
  }

  const border = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";

  const out = [];
  out.push(border);
  for (let rowIdx = 0; rowIdx < rendered.length; rowIdx++) {
    const row = rendered[rowIdx];
    const line =
      "|" +
      row
        .map((cell, idx) => {
          const padded = padAnsiRight(cell, widths[idx]);
          return ` ${padded} `;
        })
        .join("|") +
      "|";
    out.push(line);
    if (rowIdx === 0) out.push(border);
  }
  out.push(border);

  return { renderedLines: out, nextIdx: i };
}

/**
 * Render Markdown into a terminal-friendly string.
 *
 * If stdout is not a TTY, you should generally skip rendering and print raw Markdown.
 */
export function renderMarkdownToTerminal(markdown) {
  const md = String(markdown ?? "");
  const lines = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out = [];

  let inCode = false;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Fenced code blocks
    if (trimmed.startsWith("```")) {
      inCode = !inCode;
      out.push(dim(trimmed));
      continue;
    }

    if (inCode) {
      out.push(dim(line));
      continue;
    }

    // Markdown tables
    if (line.includes("|") && idx + 1 < lines.length && isTableSeparator(lines[idx + 1])) {
      const table = renderTable(lines, idx);
      out.push(...table.renderedLines);
      idx = table.nextIdx - 1;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const text = h[2].trim();
      out.push(bold(cyan(text)));
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1\1+\s*$/.test(trimmed)) {
      out.push(dim("─".repeat(40)));
      continue;
    }

    // Blockquote
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      out.push(dim(`│ ${bq[1]}`));
      continue;
    }

    // Unordered list
    const ul = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (ul) {
      const indent = ul[1] || "";
      out.push(`${indent}• ${renderInline(ul[3])}`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ol) {
      const indent = ol[1] || "";
      out.push(`${indent}${ol[2]}. ${renderInline(ol[3])}`);
      continue;
    }

    // Regular line
    out.push(renderInline(line));
  }

  return out.join("\n");
}
