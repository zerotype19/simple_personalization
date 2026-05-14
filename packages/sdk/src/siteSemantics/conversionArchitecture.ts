import type {
  ActivationOpportunity,
  GenericPageKind,
  PageSemantics,
  SessionProfile,
  SiteEnvironmentSnapshot,
  SiteScanSummary,
  SiteVertical,
} from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";
import { tryMatchActivationPlaybook } from "./matchActivationPlaybook";

export function inferActivationOpportunity(input: {
  profile: SessionProfile;
  env: SiteEnvironmentSnapshot;
  scan: SiteScanSummary;
  semantics: PageSemantics;
}): ActivationOpportunity {
  const { profile, env, scan, semantics } = input;
  const v = profile.site_context.vertical;
  const s = profile.signals;
  const pk: GenericPageKind = env.page.generic_kind;
  const nba = profile.next_best_action;
  const topConcepts = Object.entries(profile.concept_affinity).sort((a, b) => b[1] - a[1]);
  const top = topConcepts[0]?.[0] ?? "";

  let primary_path_label = "Primary conversion path";
  let secondary_path_label = "Secondary engagement path";
  let soft_path_label = "Soft exploration path";
  let inferred_need = "Understand the offer and build confidence";
  let message_angle = "Clarify value and reduce friction toward the next step";
  let offer_type = "Contextual CTA or content recommendation";
  let surface = nba?.recommended_surface?.replace(/_/g, " ") ?? "primary CTA or inline module";
  let timing =
    s.max_scroll_depth >= 55 || s.pages_viewed >= 2
      ? "After meaningful scroll or a second page view"
      : "After initial orientation on this page";
  let friction: "low" | "medium" | "high" = "low";

  if (v === "ecommerce") {
    primary_path_label = "Add to cart and checkout progression";
    secondary_path_label = "Product discovery and comparison";
    soft_path_label = "Browse categories and editorial content";
    inferred_need = "Confidence to purchase the right product";
    message_angle = "Help me choose and complete checkout";
    offer_type = "Product recommendation, incentive, or cart recovery prompt";
  } else if (v === "publisher_content" || v === "content_led_business") {
    primary_path_label = "Newsletter or subscription conversion";
    secondary_path_label = "Article depth and topic loyalty";
    soft_path_label = "Related reading and return visits";
    inferred_need = "Stay informed on the topics they care about";
    message_angle = "Deepen the reading relationship before a harder ask";
    offer_type = "Newsletter module or related story";
  } else if (v === "professional_services") {
    primary_path_label = "Consultation or contact request";
    secondary_path_label = "Trust, proof, and services education";
    soft_path_label = "Case studies and credibility content";
    inferred_need = "Proof the firm can solve their problem";
    message_angle = "Credibility-led progression into a conversation";
    offer_type = "Case study, diagnostic, or consultation CTA";
  } else if (isAutoSiteVertical(v)) {
    primary_path_label = "Vehicle inquiry, visit, or purchase";
    secondary_path_label = "Inventory comparison and financing research";
    soft_path_label = "Brand and model exploration";
    inferred_need = "Confidence to take the next retail step";
    message_angle = "Move from research to vehicle-specific action";
    offer_type = "Inventory, payment, or visit CTA";
    friction = "medium";
  } else if (v === "b2b_saas" || v === "lead_generation") {
    primary_path_label = "Guide, demo, or implementation engagement";
    secondary_path_label = "Framework and product education";
    soft_path_label = "Related content depth and repeat visits";
    inferred_need = "Make the operating model practical for their team";
    message_angle = "Implementation support and practical next steps";
    offer_type = "Implementation guide, checklist, or soft demo CTA";
  } else if (v === "nonprofit") {
    primary_path_label = "Donation, volunteer, or mission engagement";
    secondary_path_label = "Impact stories and program education";
    soft_path_label = "Events and community content";
    inferred_need = "Confidence that the mission matches their values";
    message_angle = "Story-led progression into a low-friction ask";
    offer_type = "Donation module, volunteer signup, or event CTA";
  } else {
    primary_path_label = "Primary next step (quote, booking, purchase, or signup)";
    secondary_path_label = "Trust, proof, and FAQ depth";
    soft_path_label = "Educational content and return visits";
    inferred_need = "Confidence to take the right next action for their situation";
    message_angle = "Match the ask to journey stage — proof before pressure";
    offer_type = "Contextual guide, offer, consultation, or soft popup depending on vertical";
  }

  const visitorPersona = profile.persona ? profile.persona.replace(/_/g, " ") : null;
  const visitor_read = profile.signals.return_visit
    ? `Returning anonymous visitor${visitorPersona ? ` (${visitorPersona})` : ""} — deeper engagement${
        top ? ` with “${top}” standing out` : ""
      }.`
    : `New anonymous visitor${visitorPersona ? ` (${visitorPersona})` : ""} — orienting to this page${
        top ? ` with early “${top}” interest` : ""
      }.`;

  const evidence: string[] = [];
  if (semantics.schema_types_detected.length)
    evidence.push(`Structured data types: ${semantics.schema_types_detected.slice(0, 5).join(", ")}`);
  if (semantics.b2b_signal_hits.length)
    evidence.push(`B2B language cues: ${semantics.b2b_signal_hits.join(", ")}`);
  if (semantics.commerce_signal_hits.length === 0 && v !== "ecommerce")
    evidence.push("No cart/checkout retail pattern detected in sampled body text");
  if (pk === "homepage") evidence.push("Homepage layout and multi-section structure detected");
  const convCtas =
    (scan.cta_text_hard?.length ?? 0) + (scan.cta_text_soft?.length ?? 0) || scan.primary_ctas.length;
  if (convCtas === 0 && semantics.nav_link_sample.length)
    evidence.push("Navigation sampled; no dominant conversion CTA captured yet");

  const reason: string[] = [];
  if (s.return_visit) reason.push("Return visit increases readiness for a softer second ask");
  if (profile.engagement_score >= 55 && s.cta_clicks === 0)
    reason.push("High engagement without CTA clicks — good moment for a low-friction offer");
  if (top) reason.push(`Strongest concept signal: ${top}`);
  if (nba?.reason?.length) reason.push(...nba.reason.slice(0, 3));

  let status: ActivationOpportunity["status"] = "developing";
  if (profile.engagement_score >= 52 && env.conversion.confidence >= 0.55) status = "ready";
  if (profile.engagement_score >= 68 && env.conversion.confidence >= 0.62) status = "strong";

  const confidence = Math.min(
    0.92,
    0.45 + env.conversion.confidence * 0.22 + env.page.confidence * 0.15 + (topConcepts[0]?.[1] ?? 0) * 0.12,
  );

  const opportunity_note =
    convCtas === 0
      ? "Activation opportunity: no dominant conversion CTA detected yet — consider a softer guide or checklist first."
      : "Activation opportunity: CTAs are present — align creative to the strongest concept and journey stage.";

  const base: ActivationOpportunity = {
    status,
    confidence,
    visitor_read,
    inferred_need,
    message_angle,
    offer_type,
    surface,
    timing,
    friction,
    primary_path_label,
    secondary_path_label,
    soft_path_label,
    opportunity_note,
    evidence,
    reason,
    playbook: null,
  };

  const pb = tryMatchActivationPlaybook(profile, env, scan);
  if (!pb) return base;

  const boosted = Math.min(0.95, base.confidence + 0.06);
  return {
    ...base,
    inferred_need: pb.output.inferred_need,
    message_angle: pb.output.message_angle,
    offer_type: pb.output.offer_type,
    surface: pb.output.surface,
    timing: pb.output.timing,
    friction: pb.output.friction,
    opportunity_note: pb.output.recommended_activation_summary,
    confidence: boosted,
    evidence: [`Activation playbook: ${pb.match.label}`, ...base.evidence],
    reason: [...pb.match.why, ...base.reason].slice(0, 12),
    playbook: pb.match,
  };
}
