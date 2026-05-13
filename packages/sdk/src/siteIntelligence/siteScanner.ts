import type { SiteScanSummary } from "@si/shared";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "this",
  "that",
  "are",
  "was",
  "has",
  "have",
  "will",
  "our",
  "you",
  "can",
  "not",
  "but",
  "all",
  "any",
  "get",
  "more",
  "when",
  "how",
  "what",
  "into",
  "than",
  "then",
  "them",
  "its",
  "also",
  "about",
  "just",
  "out",
  "one",
  "see",
  "use",
  "who",
  "may",
  "way",
  "new",
  "now",
  "here",
  "each",
  "over",
  "such",
  "only",
  "most",
  "some",
  "very",
  "being",
  "their",
  "there",
  "where",
  "which",
  "while",
  "after",
  "before",
  "between",
  "through",
  "during",
  "without",
  "within",
  "across",
]);

function readMeta(name: string): string {
  const el =
    document.querySelector(`meta[name="${name}"]`) ??
    document.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute("content")?.trim() ?? "";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function topTermsFromCounts(counts: Map<string, number>, limit: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function collectJsonLdStrings(maxChars: number): string {
  const parts: string[] = [];
  let n = 0;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      const walk = (v: unknown, depth: number): void => {
        if (depth > 6 || n >= maxChars) return;
        if (typeof v === "string") {
          const t = v.trim();
          if (t.length > 2 && t.length < 400) {
            parts.push(t);
            n += t.length;
          }
          return;
        }
        if (Array.isArray(v)) {
          for (const x of v) walk(x, depth + 1);
          return;
        }
        if (v && typeof v === "object") {
          for (const x of Object.values(v as Record<string, unknown>)) walk(x, depth + 1);
        }
      };
      walk(JSON.parse(raw) as unknown, 0);
    } catch {
      /* ignore */
    }
  }
  return parts.join(" ").slice(0, maxChars);
}

function detectPrimaryCtas(): string[] {
  const found = new Set<string>();
  const re =
    /\b(start|try|demo|pricing|sign\s*up|subscribe|book|contact|get\s+started|learn\s+more|join|free\s+trial|download)\b/i;
  document.querySelectorAll<HTMLElement>("main a, main button, header a, header button").forEach((el, i) => {
    if (i > 80) return;
    const t = (el.textContent ?? "").trim();
    if (t.length > 1 && t.length < 80 && re.test(t)) found.add(t.slice(0, 60));
  });
  return [...found].slice(0, 8);
}

function inferContentThemes(terms: string[]): string[] {
  const themes: string[] = [];
  const blob = terms.join(" ");
  const rules: Array<[string, RegExp]> = [
    ["marketing planning", /\b(marketing|growth)\b.*\b(plan|planning|quarter|qbr)\b|\b(plan|planning)\b.*\b(marketing|team)\b/i],
    ["team alignment", /\b(team|teams)\b.*\b(align|ritual|operating|rhythm)\b|\b(ritual|cadence)\b/i],
    ["quarterly execution", /\b(quarter|quarterly|90\s*days|okr|objectives)\b/i],
    ["content strategy", /\b(content|editorial|blog|article|insights)\b/i],
    ["product led growth", /\b(product|platform|saas|workflow|integration)\b/i],
  ];
  for (const [label, rx] of rules) {
    if (rx.test(blob)) themes.push(label);
  }
  return themes.slice(0, 6);
}

/**
 * One-pass DOM read for generic site understanding. Does not persist raw copy.
 */
export function runSiteScan(): SiteScanSummary {
  const domain = typeof window !== "undefined" ? window.location.hostname : "";
  const page_title = typeof document !== "undefined" ? document.title.trim() : "";
  const chunks: string[] = [];

  chunks.push(page_title);
  chunks.push(readMeta("description"));
  chunks.push(readMeta("og:title"));
  chunks.push(readMeta("og:description"));
  chunks.push(readMeta("og:site_name"));

  try {
    const body = document.body?.innerText ?? "";
    chunks.push(body.slice(0, 12000));
  } catch {
    /* ignore */
  }

  document.querySelectorAll<HTMLElement>("h1, h2, h3").forEach((el, i) => {
    if (i < 40) chunks.push(el.textContent ?? "");
  });

  document.querySelectorAll<HTMLElement>("nav a").forEach((el, i) => {
    if (i < 35) chunks.push(el.textContent ?? "");
  });

  chunks.push(collectJsonLdStrings(2500));

  const counts = new Map<string, number>();
  for (const c of chunks) {
    for (const w of tokenize(c)) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }

  const top_terms = topTermsFromCounts(counts, 18);
  const content_themes = inferContentThemes(top_terms);
  const primary_ctas = detectPrimaryCtas();

  const site_name =
    readMeta("og:site_name") ||
    (domain ? domain.replace(/^www\./, "").split(".")[0]?.replace(/-/g, " ") ?? null : null);

  return {
    domain,
    site_name: site_name ? site_name.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    page_title,
    top_terms,
    primary_ctas,
    content_themes,
  };
}
