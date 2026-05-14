import type { GenericPageKind, SiteScanSummary, SiteVertical } from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";

const ECOMMERCE = /\b(add\s*to\s*cart|buy\s*now|checkout|cart|basket|sku|shipping|coupon|promo\s*code)\b/i;
const LEAD = /\b(book\s*a\s*demo|request\s*a\s*demo|talk\s*to\s*sales|contact\s*sales|get\s*started|start\s*free|free\s*trial|subscribe|newsletter|contact\s*us|get\s*in\s*touch|schedule)\b/i;
const CONTENT = /\b(read\s*more|related\s*articles|share|newsletter|author)\b/i;

export function inferConversionObjectives(
  vertical: SiteVertical,
  genericKind: GenericPageKind,
  scan: SiteScanSummary,
  pathname: string,
): {
  primary_objective: string;
  secondary_objective: string | null;
  detected_elements: string[];
  confidence: number;
} {
  const detected: string[] = [];
  const path = pathname.toLowerCase();
  const ctaBlob = [
    ...(scan.cta_text_hard ?? []),
    ...(scan.cta_text_soft ?? []),
    ...scan.primary_ctas,
    ...scan.top_terms.slice(0, 8),
  ]
    .join(" | ")
    .toLowerCase();

  const pushCtaHits = (rx: RegExp, label: string) => {
    if (rx.test(ctaBlob) || rx.test(path)) detected.push(label);
  };

  pushCtaHits(ECOMMERCE, "commerce_cta");
  pushCtaHits(LEAD, "lead_cta");
  pushCtaHits(CONTENT, "content_cta");

  if (genericKind === "checkout_page" || genericKind === "cart_page") {
    detected.push("commerce_flow");
  }
  if (genericKind === "lead_form_page") detected.push("form_page");
  if (genericKind === "article_page") detected.push("article_surface");
  if (genericKind === "pricing_page") detected.push("pricing_surface");

  let primary = "explore";
  let secondary: string | null = null;
  let confidence = 0.45;

  if (vertical === "ecommerce" || genericKind === "product_detail_page" || genericKind === "cart_page") {
    primary = "purchase";
    secondary = genericKind === "product_detail_page" ? "consideration" : null;
    confidence = 0.72;
  } else if (vertical === "publisher_content" || genericKind === "article_page") {
    primary = "content_depth";
    secondary = "newsletter_signup";
    confidence = 0.68;
  } else if (vertical === "b2b_saas" || vertical === "lead_generation") {
    primary = "lead_capture_or_demo";
    secondary = "content_engagement";
    confidence = 0.66;
  } else if (vertical === "professional_services") {
    primary = "contact_or_consultation";
    secondary = "credibility_depth";
    confidence = 0.64;
  } else if (isAutoSiteVertical(vertical)) {
    primary = "vehicle_inquiry_or_visit";
    secondary = "financing_research";
    confidence = 0.7;
  } else if (detected.includes("lead_cta")) {
    primary = "lead_capture";
    confidence = 0.62;
  } else if (detected.includes("commerce_cta")) {
    primary = "purchase";
    confidence = 0.6;
  }

  if (detected.length >= 2) confidence = Math.min(0.9, confidence + 0.06);
  return {
    primary_objective: primary,
    secondary_objective: secondary,
    detected_elements: [...new Set(detected)].slice(0, 10),
    confidence,
  };
}
