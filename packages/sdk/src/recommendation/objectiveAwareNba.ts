import {
  isAutoSiteVertical,
  type PersonalizationLadderLevel,
  type Recommendation,
  type RecommendedSurface,
  type RecommendedTreatmentLevel,
  type SessionProfile,
} from "@si/shared";
import { publicSiteTypeLabel } from "../siteIntelligence/publicLabels";

function ladderToTreatmentLevel(level: PersonalizationLadderLevel): RecommendedTreatmentLevel {
  if (level <= 1) return "observe";
  if (level === 2) return "recommend_only";
  return "safe_personalization";
}

function brandHint(p: SessionProfile): string {
  const n = p.site_context.scan.site_name?.trim();
  if (n && n.length < 48) return n;
  const d = p.site_context.scan.domain.replace(/^www\./, "").split(".")[0] ?? "";
  return d ? d.replace(/-/g, " ") : "this site";
}

/**
 * Objective- and page-aware next-best-action. Uses `site_environment`, scores, and signals.
 * Auto-dealer language only for automotive verticals (`auto_retail`, `auto_oem`).
 */
export function buildObjectiveAwareRecommendation(p: SessionProfile): Recommendation {
  const env = p.site_environment;
  const { site, page, conversion, ladder } = env;
  const s = p.signals;
  const vertical = p.site_context.vertical;
  const pk = page.generic_kind;
  const po = conversion.primary_objective;
  const so = conversion.secondary_objective;
  const treatLevel = ladderToTreatmentLevel(ladder.level);
  const brand = brandHint(p);

  const baseReasons: string[] = [
    `Site read as ${publicSiteTypeLabel(site.site_type)} (~${Math.round(site.confidence * 100)}% site confidence)`,
    `Page kind: ${pk.replace(/_/g, " ")} (~${Math.round(page.confidence * 100)}% page confidence)`,
    `Objective signal: ${po.replace(/_/g, " ")} (~${Math.round(conversion.confidence * 100)}% objective confidence)`,
  ];
  if (page.signals_used.length) baseReasons.push(`Page cues: ${page.signals_used.slice(0, 4).join("; ")}`);
  if (conversion.detected_elements.length) {
    baseReasons.push(`Conversion cues: ${conversion.detected_elements.slice(0, 5).join(", ")}`);
  }
  if (s.cta_clicks === 0 && p.engagement_score >= 55) baseReasons.push("Strong engagement without CTA clicks yet");

  let next = "";
  let surface: RecommendedSurface = "none";
  let objective = po;
  let conf = 0.55 + Math.min(0.25, (page.confidence + conversion.confidence) / 8);

  if (isAutoSiteVertical(vertical)) {
    if (pk === "product_detail_page" && s.cta_clicks === 0 && p.engagement_score >= 58) {
      next = "Promote add-to-cart, test drive, or financing next step — reduce purchase friction.";
      surface = "primary_cta";
      conf = Math.min(0.88, conf + 0.08);
    } else if (pk === "category_page" && s.pages_viewed >= 2) {
      next = "Narrow inventory emphasis using category affinity and comparison signals.";
      surface = "product_grid";
      conf = Math.min(0.82, conf + 0.05);
    } else if (pk === "cart_page" || pk === "checkout_page") {
      next = "Protect checkout momentum — reinforce trust, shipping, and incentive clarity.";
      surface = "cart";
      conf = Math.min(0.86, conf + 0.06);
    } else if (po.includes("vehicle") || po.includes("purchase")) {
      next = "Move the shopper from research to vehicle-specific action (inventory, payment, or visit).";
      surface = "primary_cta";
    } else {
      next = "Keep the session focused on inventory and next-step retail actions.";
      surface = "primary_cta";
    }
  } else if (vertical === "ecommerce") {
    if (pk === "product_detail_page" && s.cta_clicks === 0 && p.engagement_score >= 55) {
      next = "Promote add-to-cart or reduce purchase friction on this product.";
      surface = "primary_cta";
    } else if (pk === "category_page") {
      next = "Surface category-fit picks and social proof before pushing checkout.";
      surface = "product_grid";
    } else if (pk === "cart_page" || pk === "checkout_page") {
      next = "Reinforce cart/checkout value (shipping, returns, trust) to complete purchase.";
      surface = "cart";
    } else {
      next = "Guide discovery toward high-intent product or collection paths.";
      surface = "related_content";
    }
  } else if (vertical === "publisher_content" || po.includes("newsletter") || po.includes("subscription")) {
    if (pk === "article_page" && p.engagement_score >= 60 && s.cta_clicks === 0) {
      next = "Promote newsletter signup, related article, or topic cluster to deepen the relationship.";
      surface = "newsletter";
      conf = Math.min(0.84, conf + 0.06);
    } else {
      next = "Offer the next best read or subscription path aligned to this article.";
      surface = "related_content";
    }
  } else if (
    vertical === "b2b_saas" ||
    vertical === "lead_generation" ||
    po.includes("lead") ||
    po.includes("demo")
  ) {
    if (pk === "article_page" && p.engagement_score >= 58 && s.cta_clicks === 0) {
      next = `Offer a relevant guide, demo, or implementation resource for ${brand} — reader is engaged but not converting yet.`;
      surface = "related_content";
      conf = Math.min(0.86, conf + 0.07);
    } else if (pk === "pricing_page") {
      next = "Clarify packaging and next step (trial, demo, or sales) after pricing interest.";
      surface = "primary_cta";
    } else if (pk === "lead_form_page") {
      next = "Reduce form friction and restate value before submit — good moment for trust proof.";
      surface = "lead_form";
    } else {
      next = `Move engaged visitors toward demo, guide, or primary CTA for ${brand}.`;
      surface = "primary_cta";
    }
    if (so?.includes("content")) baseReasons.push(`Secondary objective hint: ${so.replace(/_/g, " ")}`);
  } else if (vertical === "professional_services" || po.includes("contact") || po.includes("consultation")) {
    if (["article_page", "unknown", "homepage"].includes(pk) && s.pages_viewed >= 2) {
      next = "Promote consultation or contact CTA after credibility-building pages in this session.";
      surface = "lead_form";
    } else {
      next = "Surface services proof (case studies) then a soft contact or consult ask.";
      surface = "related_content";
    }
  } else {
    if (pk === "article_page" && p.engagement_score >= 55 && s.cta_clicks === 0) {
      next = `Offer a relevant educational or soft next step for ${brand} — the reader is engaged but has not converted yet.`;
      surface = "related_content";
    } else {
      next = "Keep the visitor on a clear path to the strongest conversion surface detected this session.";
      surface = s.cta_clicks ? "primary_cta" : "related_content";
    }
  }

  if (treatLevel === "observe") {
    conf = Math.min(conf, 0.52);
    if (!next.toLowerCase().includes("signal-only") && !next.toLowerCase().includes("observe"))
      next = `${next} (Signal-only ladder: confirm engagement before heavier asks.)`;
  } else if (treatLevel === "recommend_only") {
    conf = Math.min(conf, 0.72);
  }

  return {
    next_best_action: next,
    treatment_hint: null,
    confidence: Math.round(conf * 100) / 100,
    reason: [...new Set(baseReasons)].slice(0, 6),
    objective,
    recommended_treatment_level: treatLevel,
    recommended_surface: surface,
  };
}
