import type { PageType } from "@si/shared";

const URL_PATTERNS: Array<{ type: PageType; re: RegExp }> = [
  { type: "inventory", re: /(inventory|listing|browse|new-cars|used-cars|search)/i },
  { type: "vdp", re: /(vehicle|vdp|details?|listings?\/[^/]+|vin)/i },
  { type: "finance", re: /(finance|payment|monthly|estimator|lease)/i },
  { type: "compare", re: /(compare|comparison|vs)/i },
  { type: "trade_in", re: /(trade-?in|trade-?value|appraisal)/i },
  { type: "test_drive", re: /(test-?drive|schedule|book-?a)/i },
  { type: "home", re: /^\/?$/ },
];

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  suv: /\bSUV\b|sport\s*utility|crossover/i,
  truck: /\btruck\b|pickup|4x4/i,
  sedan: /\bsedan\b|saloon/i,
  hybrid: /\bhybrid\b|EV|electric|plug-?in/i,
  luxury: /\bluxury\b|premium\s*trim|leather/i,
  family: /\bfamily\b|spacious|3rd\s*row|seven[- ]seat/i,
  performance: /\bperformance\b|horsepower|sport\s*mode/i,
  finance: /\bfinanc\w+|lease|APR|monthly\s*payment/i,
  safety: /\bsafety\b|airbag|crash\s*rating|IIHS|NHTSA/i,
};

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

/**
 * Sample lightweight semantic tags from the page. We do NOT store raw text.
 * Counts category keyword hits across title/metadata/headings/visible buttons.
 */
function extractCategoryHits(): Record<string, number> {
  const fragments: string[] = [];
  fragments.push(document.title || "");
  fragments.push(readMeta("description"));
  fragments.push(readMeta("og:title"));
  fragments.push(readMeta("og:description"));

  const h = document.querySelectorAll<HTMLElement>("h1, h2, h3");
  for (let i = 0; i < Math.min(h.length, 30); i++) {
    fragments.push(h[i].textContent || "");
  }
  const ctas = document.querySelectorAll<HTMLElement>(
    "[data-si-cta], button, a.btn, a.cta",
  );
  for (let i = 0; i < Math.min(ctas.length, 25); i++) {
    fragments.push(ctas[i].textContent || "");
  }
  const sample = fragments.join(" \n ").slice(0, 5000);

  const hits: Record<string, number> = {};
  for (const [tag, re] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = sample.match(re);
    if (matches) hits[tag] = matches.length;
  }
  return hits;
}

export function inferPageContext(): PageContext {
  const page_type = classifyPageType();
  const category_hits = extractCategoryHits();
  const has_pricing = !!document.querySelector(
    "[data-si-price], .price, .pricing",
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
    url: window.location.pathname + window.location.search,
    title: document.title,
    category_hits,
    has_pricing,
    has_finance_form,
    has_inventory_grid,
    has_comparison_table,
    cta_count,
  };
}
