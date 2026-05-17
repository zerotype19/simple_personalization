/**
 * Buyer-visible labels for catalog `surface_id` values.
 * Underlying IDs and DOM attributes are unchanged — rendering only.
 */
const BUYER_SURFACE_LABELS: Readonly<Record<string, string>> = {
  // Auto retail
  inventory_assist_module: "Inventory availability guidance",
  finance_payment_assist: "Payment reassurance",
  trade_in_soft_prompt: "Trade-in planning support",
  test_drive_secondary_cta: "Test-drive scheduling guidance",
  dealer_contact_assist: "Dealer contact guidance",
  card_comparison_module: "Vehicle comparison support",
  homepage_hero_secondary: "Homepage secondary guidance",
  // B2B SaaS
  implementation_readiness_checklist: "Implementation readiness guidance",
  rollout_complexity_estimator: "Rollout planning support",
  stakeholder_alignment_guide: "Stakeholder alignment support",
  migration_risk_breakdown: "Migration risk overview",
  integration_requirements_summary: "Integration planning support",
  soft_roi_framework: "ROI framing support",
  evaluation_next_steps: "Evaluation next steps",
  team_adoption_story: "Team adoption story",
  implementation_timeline_example: "Implementation timeline example",
  operational_objection_handler: "Operational objection support",
  guided_walkthrough_request: "Guided walkthrough request",
  workspace_readiness_assessment: "Workspace readiness check",
  implementation_workshop_offer: "Implementation workshop offer",
  article_inline_mid: "In-article guidance",
  implementation_readiness_inline: "Implementation readiness inline",
  pricing_page_secondary_cta: "Pricing page next step",
  comparison_module: "Comparison support",
  demo_soft_escalation: "Demo request guidance",
  // Ecommerce
  category_help_me_choose: "Category chooser guidance",
  pdp_comparison_module: "Product comparison support",
  mobile_quick_compare: "Quick compare support",
  product_fit_assistant: "Product fit guidance",
  size_or_variant_guidance: "Size and variant guidance",
  bundle_or_accessory_module: "Bundle and accessory ideas",
  cart_assist_inline: "Cart assistance",
  shipping_returns_reassurance: "Shipping and returns reassurance",
  review_summary_module: "Review summary",
  high_aov_confidence_module: "High-value purchase confidence",
  inventory_reassurance_strip: "Inventory reassurance",
  coupon_offer_secondary: "Offer guidance",
  loyalty_or_email_soft_capture: "Loyalty or email capture",
  product_recommendation_slot: "Product recommendations",
  ecom_exit_offer_popup: "Exit offer",
  // Healthcare
  education_inline_next_step: "Education next step",
  next_clinical_step_guide: "Clinical next-step guide",
  eligibility_guidance_module: "Eligibility guidance",
  coverage_reassurance_inline: "Coverage reassurance",
  insurance_coverage_helper: "Insurance coverage help",
  care_pathway_explainer: "Care pathway overview",
  screening_education_module: "Screening education",
  doctor_conversation_guide: "Doctor conversation guide",
  provider_discussion_cta: "Provider discussion prompt",
  appointment_soft_prompt: "Appointment scheduling prompt",
  soft_request_info: "Information request prompt",
  // Financial services
  rewards_comparison_module: "Rewards comparison support",
  rate_fee_explainer: "Rates and fees explainer",
  fee_transparency_module: "Fee transparency support",
  trust_reassurance_inline: "Trust reassurance",
  security_trust_module: "Security and trust overview",
  eligibility_assist: "Eligibility guidance",
  calculator_next_step: "Calculator next step",
  payment_estimate_helper: "Payment estimate support",
  refinance_scenario_explainer: "Refinance scenario overview",
  document_prep_checklist: "Document preparation checklist",
  application_soft_resume: "Application resume prompt",
  // Auto OEM
  model_discovery_assist: "Model discovery guidance",
  capability_feature_explainer: "Feature explainer",
  trim_comparison_module: "Trim comparison support",
  build_price_assist: "Build and price guidance",
  configurator_resume_module: "Configurator resume",
  ev_education_module: "EV education",
  family_use_case_module: "Family use-case ideas",
  incentive_inline_offer: "Incentive overview",
  inventory_transition_assist: "Inventory transition guidance",
  dealer_locator_soft_prompt: "Dealer locator prompt",
  owner_resource_assist: "Owner resources",
  // Publisher / generic
  article_related_next: "Related reading",
  newsletter_soft_signup: "Newsletter signup",
  topic_depth_module: "Topic depth guidance",
  return_reader_prompt: "Return reader prompt",
  inline_cta: "Inline call to action",
  soft_popup: "Light overlay prompt",
  content_recommendation: "Content recommendation",
  lead_form_assist: "Lead form assistance",
  article_inline_end: "End-of-article guidance",
  sticky_footer_cta: "Footer call to action",
};

const BUYER_SURFACE_FALLBACK = "A tailored on-site experience";

/** Human experience label for a catalog surface id (never exposes raw ids). */
export function buyerSurfaceLabel(surfaceId: string): string {
  const key = surfaceId.trim().toLowerCase();
  if (!key) return BUYER_SURFACE_FALLBACK;
  return BUYER_SURFACE_LABELS[key] ?? BUYER_SURFACE_FALLBACK;
}
