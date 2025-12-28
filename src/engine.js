import { collectDocs } from "./introspect.js";
import { buildPrompt } from "./prompt.js";
import { cacheGet, cacheSet } from "./cache.js";
import { generateText } from "./backends/index.js";
import { sha256 } from "./util/text.js";
import { hrtimeMs, nowIso } from "./util/timing.js";

function computeCacheKey({ left, right, options, leftDocs, rightDocs }) {
  const payload = {
    v: 1, // bump to invalidate cache when prompt logic changes
    left,
    right,
    backend: options.backend || "auto",
    model: options.model || null,
    level: options.level || "intermediate",
    mode: options.mode || "summary",
    includeDocs: Boolean(options.includeDocs),
    docsHash: sha256(`${leftDocs}\n---\n${rightDocs}`),
  };
  return sha256(JSON.stringify(payload));
}

export async function buildComparisonPrompt(left, right, options) {
  const includeDocs = options.includeDocs !== false;

  const [leftInfo, rightInfo] = includeDocs
    ? await Promise.all([
        collectDocs(left, { maxChars: options.maxDocChars, debug: options.debug }),
        collectDocs(right, { maxChars: options.maxDocChars, debug: options.debug }),
      ])
    : [
        { docs: "", sources: [], skipped: "docs disabled" },
        { docs: "", sources: [], skipped: "docs disabled" },
      ];

  const leftDocs = leftInfo.docs || "";
  const rightDocs = rightInfo.docs || "";

  const prompt = buildPrompt({
    left,
    right,
    leftDocs,
    rightDocs,
    level: options.level,
    mode: options.mode,
  });

  return { prompt, leftInfo, rightInfo, leftDocs, rightDocs };
}

export async function runComparison(left, right, options) {
  const t0 = hrtimeMs();

  const { prompt, leftInfo, rightInfo, leftDocs, rightDocs } = await buildComparisonPrompt(
    left,
    right,
    options
  );

  const key = computeCacheKey({ left, right, options, leftDocs, rightDocs });

  const ttlHours = Number.isFinite(options.ttlHours) ? options.ttlHours : 720;
  const ttlMs = Math.max(0, ttlHours) * 60 * 60 * 1000;
  const now = Date.now();

  if (options.cache !== false) {
    const cached = await cacheGet(key);
    if (cached?.text) {
      const t1 = hrtimeMs();
      return {
        left,
        right,
        backend: cached.backendUsed || cached.backend || options.backend || "auto",
        model: cached.modelUsed || cached.model || options.model || null,
        cached: true,
        createdAt: cached.createdAt,
        text: cached.text,
        meta: {
          cacheKey: key,
          cacheHit: true,
          msTotal: t1 - t0,
          sources: {
            left: leftInfo.sources,
            right: rightInfo.sources,
          },
          skipped: {
            left: leftInfo.skipped,
            right: rightInfo.skipped,
          },
        },
      };
    }
  }

  const tLLM0 = hrtimeMs();
  const gen = await generateText({
    backend: options.backend,
    prompt,
    model: options.model,
  });
  const tLLM1 = hrtimeMs();

  const createdAt = nowIso();
  const expiresAt = ttlMs > 0 ? new Date(now + ttlMs).toISOString() : null;

  const entry = {
    createdAt,
    expiresAt,
    text: gen.text,
    backendUsed: gen.backendUsed,
    modelUsed: gen.modelUsed,
  };

  if (options.cache !== false) {
    await cacheSet(key, entry);
  }

  const t1 = hrtimeMs();

  return {
    left,
    right,
    backend: gen.backendUsed,
    model: gen.modelUsed,
    cached: false,
    createdAt,
    text: gen.text,
    meta: {
      cacheKey: key,
      cacheHit: false,
      msTotal: t1 - t0,
      msLLM: tLLM1 - tLLM0,
      sources: {
        left: leftInfo.sources,
        right: rightInfo.sources,
      },
      skipped: {
        left: leftInfo.skipped,
        right: rightInfo.skipped,
      },
    },
  };
}
