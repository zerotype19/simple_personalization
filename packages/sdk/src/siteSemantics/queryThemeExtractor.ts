const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "this",
  "that",
  "you",
  "our",
  "are",
  "was",
  "has",
  "have",
  "will",
  "not",
  "but",
  "all",
  "any",
  "can",
  "get",
  "more",
  "how",
  "what",
  "when",
  "who",
  "why",
  "into",
  "about",
  "just",
  "best",
  "top",
  "new",
  "free",
]);

/** Map raw tokens to privacy-safe theme buckets (no raw query string retained). */
const BUCKETS: Array<{ theme: string; patterns: RegExp[] }> = [
  { theme: "planning", patterns: [/\b(plan|planning|planner|quarter|qbr|quarterly|okr|okrs|roadmap|priorities)\b/i] },
  { theme: "framework", patterns: [/\b(framework|methodology|playbook|operating|model|system)\b/i] },
  { theme: "operations", patterns: [/\b(operations|ops|execution|workflow|process|cadence)\b/i] },
  { theme: "evaluation", patterns: [/\b(evaluate|evaluation|compare|versus|vs|benchmark|review)\b/i] },
  { theme: "pricing", patterns: [/\b(pricing|price|cost|budget|afford|financing|apr|lease)\b/i] },
  { theme: "implementation", patterns: [/\b(implement|implementation|deploy|integration|setup|rollout)\b/i] },
  { theme: "lead_intent", patterns: [/\b(demo|trial|quote|contact|consult|signup|register|book)\b/i] },
  { theme: "product_research", patterns: [/\b(product|sku|inventory|vehicle|model|spec|feature)\b/i] },
  { theme: "health_education", patterns: [/\b(insurance|symptom|treatment|care|patient|clinical)\b/i] },
];

function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/\+/g, " ")
    .split(/[^a-z0-9]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 32);
}

/**
 * Derive privacy-safe query themes from common search params (`q`, `query`, `text`, `s`, `search`).
 * Raw query text is tokenized and discarded; only normalized theme labels are returned.
 */
export function extractQueryThemes(href: string): string[] {
  let url: URL;
  try {
    url = new URL(href, "https://placeholder.local");
  } catch {
    return [];
  }
  const keys = ["q", "query", "text", "s", "search", "keyword", "keywords"] as const;
  const chunks: string[] = [];
  for (const k of keys) {
    const v = url.searchParams.get(k);
    if (v) chunks.push(v);
  }
  if (!chunks.length) return [];

  const themes = new Set<string>();
  for (const chunk of chunks) {
    const words = tokenize(chunk);
    for (const w of words) {
      for (const { theme, patterns } of BUCKETS) {
        if (patterns.some((p) => p.test(w))) {
          themes.add(theme);
          break;
        }
      }
    }
  }
  return [...themes].slice(0, 10);
}
