import type { SessionSignals, SiteScanSummary, SiteVertical } from "@si/shared";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/**
 * Map raw session counters into display-friendly metrics for the inspector.
 */
export function buildDynamicSignals(
  vertical: SiteVertical,
  signals: SessionSignals,
  scan: SiteScanSummary,
): Record<string, string> {
  const pages = signals.pages_viewed;
  const scroll = signals.max_scroll_depth;
  const durS = Math.round(signals.session_duration_ms / 1000);
  const cta = signals.cta_clicks;

  if (vertical === "auto_retail") {
    return {
      Pages: String(pages),
      "VDP views": String(signals.vdp_views),
      "Pricing views": String(signals.pricing_views),
      "Finance interactions": String(signals.finance_interactions),
      "Compare interactions": String(signals.compare_interactions),
      "CTA clicks": String(cta),
      "Max scroll": `${scroll}%`,
      "Return visit": signals.return_visit ? "yes" : "no",
      Duration: `${durS}s`,
    };
  }

  const contentDepth = clamp(scroll * 0.65 + Math.min(pages, 24) * 1.4 + Math.min(durS / 4, 22), 0, 100);
  const frameworkInterest = clamp(
    scan.content_themes.length * 14 + (scan.top_terms.some((t) => /plan|ritual|quarter|okr|cadence/i.test(t)) ? 22 : 0),
    0,
    100,
  );
  const productInterest = clamp(cta * 12 + scroll * 0.22 + pages * 2.5, 0, 100);
  const demoIntent = clamp(cta * 18 + (scan.primary_ctas.some((c) => /demo|trial|book/i.test(c)) ? 24 : 0), 0, 100);
  const conversionReadiness = clamp(
    cta * 15 + (signals.return_visit ? 12 : 0) + scroll * 0.15,
    0,
    100,
  );

  const base: Record<string, string> = {
    "Pages viewed": String(pages),
    "Content depth": String(contentDepth),
    "Framework interest": String(frameworkInterest),
    "Product interest": String(productInterest),
    "Demo / trial intent": String(demoIntent),
    "Conversion readiness": String(conversionReadiness),
    "CTA clicks": String(cta),
    "Max scroll": `${scroll}%`,
    "Return visit": signals.return_visit ? "yes" : "no",
    Duration: `${durS}s`,
  };

  if (vertical === "publisher_content") {
    base["Article depth"] = String(clamp(scroll * 0.7 + pages * 3, 0, 100));
  }
  if (vertical === "ecommerce") {
    base["Browse intensity"] = String(clamp(pages * 4 + scroll * 0.35, 0, 100));
  }

  return base;
}

/** Topic-style hits for affinity merge (non-auto verticals). */
export function topicAffinityHitsFromScan(scan: SiteScanSummary): Record<string, number> {
  const out: Record<string, number> = {};
  scan.top_terms.forEach((t, i) => {
    out[t] = Math.max(1, 24 - i);
  });
  for (const th of scan.content_themes) {
    const k = th.toLowerCase().replace(/\s+/g, "_");
    out[k] = (out[k] ?? 0) + 10;
  }
  return out;
}
