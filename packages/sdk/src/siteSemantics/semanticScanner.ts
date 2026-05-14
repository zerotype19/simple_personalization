import type { PageSemantics, SiteEnvironmentSnapshot, SiteScanSummary, SiteVertical } from "@si/shared";
import { detectCmsPlatform } from "./cmsPlatformAnalyzer";
import { detectCommerceSignals } from "./commerceAnalyzer";
import { analyzeCtaProminence, primaryCtaNarrative } from "./ctaAnalyzer";
import { analyzeForms } from "./formAnalyzer";
import { analyzeHeadings } from "./headingAnalyzer";
import { summarizeLinkIntent } from "./linkIntentAnalyzer";
import { normalizeReadableText } from "./normalizeText";
import { detectSchemaTypes } from "./schemaAnalyzer";

function readMetaContent(nameOrProperty: string): string {
  if (typeof document === "undefined") return "";
  const el =
    document.querySelector(`meta[name="${nameOrProperty}"]`) ??
    document.querySelector(`meta[property="${nameOrProperty}"]`);
  return normalizeReadableText(el?.getAttribute("content") ?? "");
}

function readCanonical(): string | null {
  if (typeof document === "undefined") return null;
  const href = document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim();
  return href || null;
}

function navSample(): string[] {
  if (typeof document === "undefined") return [];
  const out: string[] = [];
  document.querySelectorAll("nav a").forEach((el, i) => {
    if (i > 12) return;
    const t = normalizeReadableText(el.textContent ?? "");
    if (t.length > 1 && t.length < 48) out.push(t);
  });
  return [...new Set(out)].slice(0, 8);
}

function detectB2bHits(scan: SiteScanSummary, vertical: SiteVertical): string[] {
  if (
    vertical !== "b2b_saas" &&
    vertical !== "lead_generation" &&
    vertical !== "professional_services" &&
    vertical !== "unknown"
  ) {
    return [];
  }
  const blob = `${scan.page_title} ${scan.top_terms.join(" ")} ${scan.content_themes.join(" ")}`.toLowerCase();
  const hits: string[] = [];
  if (/\b(demo|trial|pricing|request|contact|get started)\b/i.test(blob)) hits.push("conversion_language");
  if (/\b(case study|customers?|logo wall|integration)\b/i.test(blob)) hits.push("proof_language");
  if (/\b(security|compliance|soc2|iso)\b/i.test(blob)) hits.push("trust_language");
  if (/\b(framework|operating system|playbook|methodology)\b/i.test(blob)) hits.push("methodology_language");
  return [...new Set(hits)].slice(0, 8);
}

export function runSiteSemantics(
  scan: SiteScanSummary,
  _env: SiteEnvironmentSnapshot,
  vertical: SiteVertical,
): PageSemantics {
  const headings = analyzeHeadings();
  const schema_types_detected = detectSchemaTypes();
  const cms_platform = detectCmsPlatform();
  const forms = analyzeForms();
  const commerce = detectCommerceSignals();
  const ctaHits = analyzeCtaProminence(scan);
  const meta_description_snippet = (() => {
    const d = readMetaContent("description");
    return d.length > 200 ? `${d.slice(0, 197)}…` : d || null;
  })();

  const primary_promise =
    headings.h1_primary ?? (normalizeReadableText(scan.page_title) || null);

  return {
    canonical_href: readCanonical(),
    meta_description_snippet: meta_description_snippet || null,
    og_title: readMetaContent("og:title") || null,
    og_type: readMetaContent("og:type") || null,
    twitter_title: readMetaContent("twitter:title") || null,
    schema_types_detected,
    h1_primary: headings.h1_primary,
    heading_counts: headings.heading_counts,
    primary_promise: primary_promise,
    nav_link_sample: navSample(),
    form_guesses: forms,
    link_intent_summary: summarizeLinkIntent(typeof window !== "undefined" ? window.location.pathname : ""),
    commerce_signal_hits: commerce,
    b2b_signal_hits: detectB2bHits(scan, vertical),
    cms_platform,
    cta_layout_summary: primaryCtaNarrative(scan, ctaHits.header_hits, ctaHits.main_hits),
  };
}

export { primaryCtaNarrative } from "./ctaAnalyzer";
