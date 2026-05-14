import type { GenericPageKind, SiteFingerprint, SiteScanSummary, SiteVertical } from "@si/shared";
import { guessPlatform } from "./platformGuess";

const ARTICLE_CONTENT_VERTICALS: SiteVertical[] = [
  "b2b_saas",
  "publisher_content",
  "unknown",
  "general_business",
  "content_led_business",
  "healthcare",
  "financial_services",
  "education",
  "travel_hospitality",
  "real_estate",
  "home_services",
  "local_services",
  "lead_generation",
  "professional_services",
  "nonprofit",
];

function compositeSiteType(vertical: SiteVertical, isArticle: boolean): string {
  if (isArticle && ARTICLE_CONTENT_VERTICALS.includes(vertical)) {
    return `${vertical}_content`;
  }
  return vertical;
}

function likelySiteObjective(vertical: SiteVertical): string {
  switch (vertical) {
    case "ecommerce":
      return "purchase";
    case "publisher_content":
    case "content_led_business":
      return "content_engagement_to_subscription";
    case "b2b_saas":
      return "content_engagement_to_lead_capture";
    case "lead_generation":
      return "lead_capture";
    case "professional_services":
      return "contact_request_or_consultation";
    case "nonprofit":
      return "donation_or_volunteer";
    case "auto_retail":
    case "auto_oem":
      return "vehicle_inquiry_or_visit";
    case "healthcare":
      return "appointment_or_patient_intake";
    case "financial_services":
      return "application_or_advisory_lead";
    case "education":
      return "application_or_inquiry";
    case "travel_hospitality":
      return "booking_or_inquiry";
    case "real_estate":
      return "listing_inquiry_or_tour";
    case "home_services":
    case "local_services":
      return "quote_or_booking_request";
    default:
      return "explore_or_unknown";
  }
}

export function buildSiteFingerprint(
  scan: SiteScanSummary,
  vertical: SiteVertical,
  verticalConfidencePct: number,
  genericKind: GenericPageKind,
): SiteFingerprint {
  const confidence = Math.max(0, Math.min(1, verticalConfidencePct / 100));
  const isArticle = genericKind === "article_page";
  const primary_topics = [...scan.content_themes, ...scan.top_terms.slice(0, 6)].filter(
    (v, i, a) => a.indexOf(v) === i,
  ).slice(0, 10);

  return {
    domain: scan.domain,
    site_type: compositeSiteType(vertical, isArticle),
    confidence,
    primary_topics,
    detected_ctas: [...scan.primary_ctas].slice(0, 10),
    likely_objective: likelySiteObjective(vertical),
    platform_guess: guessPlatform(),
  };
}
