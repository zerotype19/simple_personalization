import type { SiteScanSummary, SiteVertical } from "@si/shared";

function score(text: string, patterns: RegExp[]): number {
  let s = 0;
  for (const p of patterns) {
    if (p.test(text)) s += 1;
  }
  return s;
}

/**
 * Rules-first vertical guess from URL + light scan tokens (no ML).
 */
export function classifyVertical(
  scan: SiteScanSummary,
  pathname: string,
): { vertical: SiteVertical; confidence: number } {
  const path = pathname.toLowerCase();
  const blob = `${path} ${scan.page_title} ${scan.top_terms.join(" ")} ${scan.content_themes.join(" ")}`.toLowerCase();

  const autoPath = /(inventory|vehicle|vdp|vin|cars?|trucks?|suv|dealership|finance|lease|trade-?in|test-?drive)/i;
  const autoLex = score(blob, [
    /\b(vdp|msrp|apr|lease|financ|carfax|dealership|oem|trim|horsepower)\b/i,
    /\b(suv|sedan|truck|crossover|hybrid\s+vehicle)\b/i,
  ]);

  if (autoPath.test(path) || autoLex >= 2) {
    return { vertical: "auto_retail", confidence: Math.min(95, 70 + autoLex * 10) };
  }

  const scores: Array<{ v: SiteVertical; s: number }> = [
    {
      v: "ecommerce",
      s: score(blob, [
        /\b(cart|checkout|sku|shop|store|add\s+to\s+bag|shipping|coupon)\b/i,
        /\/product\//i,
      ]),
    },
    {
      v: "publisher_content",
      s: score(blob, [
        /\b(blog|article|post|newsletter|author|editorial|insights|magazine)\b/i,
        /\/(blog|posts?|articles?|news)\b/i,
      ]),
    },
    {
      v: "b2b_saas",
      s: score(blob, [
        /\b(saas|platform|workflow|integration|api|teams|demo|pricing|trial|signup|b2b)\b/i,
        /\b(software|dashboard|workspace|subscription)\b/i,
      ]),
    },
    {
      v: "professional_services",
      s: score(blob, [
        /\b(consulting|services|clients|capabilities|case\s+study|agency)\b/i,
      ]),
    },
    {
      v: "lead_generation",
      s: score(blob, [/\b(get\s+a\s+quote|contact\s+us|book\s+a\s+call|request\s+info)\b/i]),
    },
    {
      v: "nonprofit",
      s: score(blob, [/\b(donate|volunteer|501|mission|nonprofit|charity)\b/i]),
    },
  ];

  scores.sort((a, b) => b.s - a.s);
  const best = scores[0]!;
  if (best.s >= 2) {
    return { vertical: best.v, confidence: Math.min(92, 55 + best.s * 12) };
  }
  if (best.s === 1) {
    return { vertical: best.v, confidence: 62 };
  }

  /** Marketing / content sites without strong vertical cues (e.g. rhythm90.io). */
  if (scan.top_terms.length >= 6) {
    return { vertical: "b2b_saas", confidence: 58 };
  }

  return { vertical: "unknown", confidence: 40 };
}
