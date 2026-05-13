import type { PageType, SiteScanSummary, SiteVertical } from "@si/shared";
import { topicAffinityHitsFromScan } from "./siteIntelligence/dynamicSignalModel";

const URL_PATTERNS: Array<{ type: PageType; re: RegExp }> = [
  { type: "inventory", re: /(inventory|listing|browse|new-cars|used-cars|search)/i },
  { type: "vdp", re: /(vehicle|vdp|details?|listings?\/[^/]+|vin)/i },
  { type: "finance", re: /(finance|payment|monthly|estimator|lease)/i },
  { type: "compare", re: /(compare|comparison|vs)/i },
  { type: "trade_in", re: /(trade-?in|trade-?value|appraisal)/i },
  { type: "test_drive", re: /(test-?drive|schedule|book-?a)/i },
  { type: "home", re: /^\/?$/ },
];

/**
 * Category tags inferred from visible copy, URL slugs, and structured data.
 * Works on typical marketing sites without `data-si-*` — those slots are extra signal when present.
 */
const CATEGORY_RULES: Array<{ tag: string; re: RegExp }> = [
  { tag: "suv", re: /\bSUVs?\b|sport\s*utility|crossover|CUV\b/i },
  { tag: "truck", re: /\btrucks?\b|pickup|pick[-\s]?up|4x4|crew\s*cab/i },
  { tag: "sedan", re: /\bsedans?\b|saloon/i },
  { tag: "hybrid", re: /\bhybrids?\b|plug[-\s]?in|PHEV|HEV|\bEVs?\b|electric/i },
  { tag: "luxury", re: /\bluxury\b|premium\s*trim|prestige|leather/i },
  { tag: "family", re: /\bfamily\b|spacious|3rd\s*row|third\s*row|seven[-\s]seat|eight[-\s]passenger/i },
  { tag: "performance", re: /\bperformance\b|horsepower|sport\s*mode|\bRS\b|\bAMG\b/i },
  { tag: "finance", re: /\bfinanc\w+|lease|APR|monthly\s*payment/i },
  { tag: "safety", re: /\bsafety\b|airbag|crash\s*rating|IIHS|NHTSA/i },
];

export interface PageContext {
  page_type: PageType;
  url: string;
  title: string;
  category_hits: Record<string, number>;
  has_pricing: boolean;
  has_finance_form: boolean;
  has_inventory_grid: boolean;
  has_comparison_table: boolean;
  cta_count: number;
}

function readMeta(name: string): string {
  const el =
    document.querySelector(`meta[name="${name}"]`) ??
    document.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute("content") ?? "";
}

function classifyPageType(): PageType {
  const declared = document.documentElement.getAttribute("data-si-page");
  if (declared) return declared as PageType;
  const path = window.location.pathname;
  for (const { type, re } of URL_PATTERNS) {
    if (re.test(path)) return type;
  }
  return "other";
}

function mergeHits(into: Record<string, number>, more: Record<string, number>, weight = 1): void {
  for (const [k, raw] of Object.entries(more)) {
    const v = Math.round(raw * weight);
    if (v <= 0) continue;
    into[k] = (into[k] ?? 0) + v;
  }
}

/** Strong signal from URL path / slug (works when body copy is sparse). */
function hitsFromUrl(pathname: string, search = ""): Record<string, number> {
  const hits: Record<string, number> = {};
  const blob = `${pathname} ${search}`.toLowerCase();
  const slugRules: Array<{ tag: string; re: RegExp }> = [
    { tag: "suv", re: /(^|[/_-])suv([/_-]|$)|crossover|cuv/i },
    { tag: "sedan", re: /(^|[/_-])sedan([/_-]|$)|saloon/i },
    { tag: "truck", re: /(^|[/_-])truck|pickup|pick[-\s]?up|crew[-\s]?cab/i },
    { tag: "hybrid", re: /hybrid|phev|hev|(^|[/_-])ev([/_-]|$)|electric|plugin/i },
    { tag: "luxury", re: /luxury|prestige|platinum|signature/i },
    { tag: "family", re: /family|8[-\s]?pass|8pax|3[-\s]?row|third[-\s]?row/i },
    { tag: "performance", re: /sport|performance|type[-\s]?r|\brs\b|amg/i },
    { tag: "safety", re: /safety|iihs|nhtsa/i },
  ];
  for (const { tag, re } of slugRules) {
    if (re.test(blob)) hits[tag] = (hits[tag] ?? 0) + 4;
  }
  return hits;
}

function hitsFromKeywords(sample: string): Record<string, number> {
  const hits: Record<string, number> = {};
  for (const { tag, re } of CATEGORY_RULES) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const global = new RegExp(re.source, flags);
    const m = sample.match(global);
    if (m?.length) hits[tag] = m.length;
  }
  return hits;
}

function collectStringsFromJson(value: unknown, depth: number, maxDepth: number): string[] {
  if (depth > maxDepth) return [];
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 && t.length < 400 ? [t] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((x) => collectStringsFromJson(x, depth + 1, maxDepth));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((x) =>
      collectStringsFromJson(x, depth + 1, maxDepth),
    );
  }
  return [];
}

function scrapeJsonLdText(): string {
  const parts: string[] = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      parts.push(...collectStringsFromJson(data, 0, 5));
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return parts.join(" \n ").slice(0, 4000);
}

/**
 * Sample semantic text from the live DOM (no raw payload to servers — only derived counts).
 * Uses headings, main content, links, buttons, list items, breadcrumbs, JSON-LD, URL, and optional `data-si-slot`.
 */
export function extractCategoryHits(): Record<string, number> {
  const hits: Record<string, number> = {};
  const fragments: string[] = [];

  const push = (s: string | null | undefined) => {
    const t = (s ?? "").trim();
    if (t) fragments.push(t);
  };

  push(document.title);
  push(readMeta("description"));
  push(readMeta("keywords"));
  push(readMeta("og:title"));
  push(readMeta("og:description"));

  const path = window.location.pathname;
  const search = window.location.search;
  mergeHits(hits, hitsFromUrl(path, search));

  try {
    const bodyText = document.body?.innerText ?? "";
    push(bodyText.slice(0, 14000));
  } catch {
    /* ignore */
  }

  document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, [role='heading']").forEach((el, i) => {
    if (i < 45) push(el.textContent);
  });

  document.querySelectorAll<HTMLElement>("[data-si-slot]").forEach((el, i) => {
    if (i < 40) push(el.textContent);
  });

  document.querySelectorAll<HTMLElement>("main a[href]").forEach((el, i) => {
    if (i < 55) push(`${el.textContent} ${el.getAttribute("href") ?? ""}`);
  });

  document.querySelectorAll<HTMLElement>("main button").forEach((el, i) => {
    if (i < 45) push(el.textContent);
  });

  document.querySelectorAll<HTMLElement>("main li").forEach((el, i) => {
    if (i < 60) push(el.textContent);
  });

  document
    .querySelectorAll<HTMLElement>(
      'nav[aria-label*="breadcrumb" i] a, [class*="breadcrumb" i] a, ol.breadcrumb a',
    )
    .forEach((el, i) => {
      if (i < 20) push(el.textContent);
    });

  push(scrapeJsonLdText());

  const sample = fragments.join("\n").slice(0, 24000);
  mergeHits(hits, hitsFromKeywords(sample), 1);
  return hits;
}

export function inferPageContext(opts?: {
  minimal?: boolean;
  vertical?: SiteVertical;
  scan?: SiteScanSummary | null;
}): PageContext {
  const page_type = classifyPageType();
  const url = window.location.pathname + window.location.search;
  const title = document.title;
  let category_hits: Record<string, number> = {};
  if (!opts?.minimal) {
    const v = opts?.vertical ?? "auto_retail";
    if (v === "auto_retail") {
      category_hits = extractCategoryHits();
    } else if (opts?.scan) {
      category_hits = topicAffinityHitsFromScan(opts.scan);
    }
  }
  const has_pricing = !!document.querySelector(
    "[data-si-price], .price, .pricing, [itemprop='price']",
  );
  const has_finance_form = !!document.querySelector(
    "[data-si-finance], form[data-finance], #finance-form",
  );
  const has_inventory_grid = !!document.querySelector(
    "[data-si-inventory], .inventory-grid",
  );
  const has_comparison_table = !!document.querySelector(
    "[data-si-compare], table.compare, .compare-table",
  );
  const cta_count = document.querySelectorAll(
    "[data-si-cta], button.primary, a.cta",
  ).length;

  return {
    page_type,
    url,
    title,
    category_hits,
    has_pricing,
    has_finance_form,
    has_inventory_grid,
    has_comparison_table,
    cta_count,
  };
}
