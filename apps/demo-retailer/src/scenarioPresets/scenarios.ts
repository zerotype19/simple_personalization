import type { SiteVertical } from "@si/shared";
import type { FixtureSessionInput } from "@si/sdk";
import { buildScenarioFixture, type ScenarioStepSpec } from "./buildScenarioStep";

export type ScenarioGroupId =
  | "b2b_saas"
  | "ecommerce"
  | "healthcare"
  | "financial_services"
  | "auto_retail";

export interface ScenarioPreset {
  id: string;
  group: ScenarioGroupId;
  groupTitle: string;
  label: string;
  progressionLabels: readonly string[];
  frames: FixtureSessionInput[];
}

const GROUP_TITLE: Record<ScenarioGroupId, string> = {
  b2b_saas: "B2B SaaS",
  ecommerce: "Ecommerce",
  healthcare: "Healthcare",
  financial_services: "Financial services",
  auto_retail: "Auto",
};

function scenario(
  id: string,
  group: ScenarioGroupId,
  label: string,
  vertical: SiteVertical,
  progressionLabels: readonly string[],
  steps: ScenarioStepSpec[],
): ScenarioPreset {
  if (progressionLabels.length !== steps.length) {
    throw new Error(`${id}: progressionLabels must match step count`);
  }
  return {
    id,
    group,
    groupTitle: GROUP_TITLE[group],
    label,
    progressionLabels,
    frames: steps.map((s, i) => buildScenarioFixture(`${id}_${i}`, vertical, s)),
  };
}

/** Deterministic golden journeys: each step is a `SessionProfile` built like a fixture, replayed via `runDecisionReplay`. */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  scenario(
    "saas_early_researcher",
    "b2b_saas",
    "Early researcher",
    "b2b_saas",
    ["Researching", "Researching", "Comparing", "Implementation-focused"],
    [
      { path: ["/resources/what-is-category"], ao: 0.62, readiness: 44, posture: "observe_only", phase: "research" },
      { path: ["/resources/what-is-category", "/platform/overview"], ao: 0.68, readiness: 48, posture: "observe_only", phase: "research" },
      { path: ["/resources/what-is-category", "/platform/overview", "/compare"], ao: 0.76, readiness: 56, comparison: true, phase: "comparison" },
      { path: ["/resources/what-is-category", "/platform/overview", "/compare", "/implementation"], ao: 0.84, readiness: 64, comparison: true, phase: "validation" },
    ],
  ),
  scenario(
    "saas_comparison_evaluator",
    "b2b_saas",
    "Comparison-heavy evaluator",
    "b2b_saas",
    ["Comparing", "Comparing", "Evaluating", "Implementation-focused"],
    [
      { path: ["/compare/vendors"], ao: 0.72, readiness: 52, comparison: true, phase: "comparison", engagement: 52 },
      { path: ["/compare/vendors", "/pricing"], ao: 0.78, readiness: 58, comparison: true, phase: "comparison", engagement: 56, pricingViews: 1 },
      { path: ["/compare/vendors", "/pricing", "/security"], ao: 0.82, readiness: 62, comparison: true, phase: "evaluation", engagement: 60 },
      { path: ["/compare/vendors", "/pricing", "/security", "/integrations"], ao: 0.88, readiness: 68, comparison: true, phase: "validation", engagement: 64 },
    ],
  ),
  scenario(
    "saas_implementation_buyer",
    "b2b_saas",
    "Implementation-focused buyer",
    "b2b_saas",
    ["Researching", "Implementation-focused", "Rollout planning", "Stakeholder-ready"],
    [
      { path: ["/implementation"], ao: 0.74, readiness: 58, phase: "research", engagement: 54 },
      { path: ["/implementation", "/rollout"], ao: 0.8, readiness: 64, phase: "evaluation", engagement: 58, journey: "comparison" },
      { path: ["/implementation", "/rollout", "/adoption"], ao: 0.86, readiness: 70, phase: "validation", engagement: 62, journey: "comparison" },
      { path: ["/implementation", "/rollout", "/adoption", "/stakeholders"], ao: 0.9, readiness: 76, phase: "validation", engagement: 66, journey: "conversion" },
    ],
  ),
  scenario(
    "saas_escalation_earned",
    "b2b_saas",
    "Escalation earned",
    "b2b_saas",
    ["Exploring", "Evaluating", "Ready for next step", "Escalation earned"],
    [
      { path: ["/docs"], ao: 0.64, readiness: 46, posture: "observe_only", phase: "research" },
      { path: ["/docs", "/product-tour"], ao: 0.74, readiness: 56, posture: "soft_cta_ready", phase: "comparison" },
      { path: ["/docs", "/product-tour", "/demo-prep"], ao: 0.84, readiness: 68, posture: "soft_cta_ready", phase: "evaluation", engagement: 58 },
      { path: ["/docs", "/product-tour", "/demo-prep", "/talk-sales"], ao: 0.92, readiness: 78, posture: "hard_cta_ready", phase: "conversion_ready", engagement: 66, ctaClicks: 1 },
    ],
  ),
  scenario(
    "saas_suppression_path",
    "b2b_saas",
    "Suppression path",
    "b2b_saas",
    ["Curiosity", "Thin signals", "Hard ask withheld", "Restraint held"],
    [
      { path: ["/"], ao: 0.58, readiness: 40, posture: "observe_only", phase: "discovery" },
      { path: ["/", "/quick-tour"], ao: 0.42, readiness: 36, posture: "observe_only", phase: "research", rapidScanner: true },
      { path: ["/", "/quick-tour", "/pricing"], ao: 0.32, readiness: 32, posture: "observe_only", phase: "research", rapidScanner: true },
      { path: ["/", "/quick-tour", "/pricing", "/book-demo"], ao: 0.28, readiness: 28, posture: "avoid_interrupt", phase: "research", rapidScanner: true },
    ],
  ),

  scenario(
    "ecom_product_comparison",
    "ecommerce",
    "Product comparison shopper",
    "ecommerce",
    ["Browsing", "Comparing PDPs", "Sizing fit", "Reassurance"],
    [
      { path: ["/category/seating"], ao: 0.62, readiness: 44, phase: "research" },
      { path: ["/category/seating", "/product/a"], ao: 0.7, readiness: 50, phase: "comparison", compareInteractions: 1 },
      { path: ["/category/seating", "/product/a", "/product/b"], ao: 0.78, readiness: 56, comparison: true, phase: "comparison" },
      { path: ["/category/seating", "/product/a", "/product/b", "/shipping"], ao: 0.82, readiness: 60, comparison: true, phase: "evaluation" },
    ],
  ),
  scenario(
    "ecom_high_aov",
    "ecommerce",
    "High-AOV reassurance",
    "ecommerce",
    ["Discovery", "Premium consideration", "Trust check", "Confident next step"],
    [
      { path: ["/collections/premium"], ao: 0.66, readiness: 48, phase: "research" },
      { path: ["/collections/premium", "/product/flagship"], ao: 0.74, readiness: 54, phase: "comparison" },
      { path: ["/collections/premium", "/product/flagship", "/reviews"], ao: 0.82, readiness: 62, phase: "evaluation" },
      {
        path: ["/collections/premium", "/product/flagship", "/reviews", "/warranty"],
        ao: 0.88,
        readiness: 68,
        phase: "validation",
        conceptAffinity: { "trust reviews": 0.55 },
      },
    ],
  ),
  scenario(
    "ecom_shipping_hesitation",
    "ecommerce",
    "Shipping hesitation",
    "ecommerce",
    ["Cart interest", "Delivery questions", "Restraint on pushy upsell", "Clarity first"],
    [
      { path: ["/cart"], ao: 0.7, readiness: 50, phase: "comparison", conceptAffinity: { "cart checkout intent": 0.55 } },
      { path: ["/cart", "/shipping-policies"], ao: 0.74, readiness: 52, phase: "evaluation", posture: "soft_cta_ready" },
      { path: ["/cart", "/shipping-policies", "/checkout"], ao: 0.68, readiness: 50, posture: "avoid_interrupt", phase: "evaluation" },
      { path: ["/cart", "/shipping-policies", "/checkout", "/delivery-estimate"], ao: 0.78, readiness: 58, posture: "soft_cta_ready", phase: "validation" },
    ],
  ),
  scenario(
    "ecom_coupon_restraint",
    "ecommerce",
    "Coupon restraint",
    "ecommerce",
    ["Deal seeker", "Promo awareness", "Popup / aggressive offer withheld", "Calm pacing"],
    [
      { path: ["/sale"], ao: 0.6, readiness: 42, phase: "research", conceptAffinity: { "price promo sensitivity": 0.62 } },
      { path: ["/sale", "/product/deal"], ao: 0.66, readiness: 46, phase: "comparison" },
      { path: ["/sale", "/product/deal", "/cart"], ao: 0.52, readiness: 40, phase: "comparison", rapidScanner: true },
      { path: ["/sale", "/product/deal", "/cart", "/checkout"], ao: 0.38, readiness: 34, phase: "evaluation", rapidScanner: true, posture: "observe_only" },
    ],
  ),
  scenario(
    "ecom_mobile_discovery",
    "ecommerce",
    "Mobile discovery flow",
    "ecommerce",
    ["Mobile browse", "Quick compare", "Compact guidance", "Next step earned"],
    [
      { path: ["/m/category"], ao: 0.6, readiness: 42, mobile: true, phase: "research" },
      { path: ["/m/category", "/m/product/x"], ao: 0.7, readiness: 50, mobile: true, phase: "comparison" },
      { path: ["/m/category", "/m/product/x", "/m/product/y"], ao: 0.76, readiness: 55, mobile: true, comparison: true, phase: "comparison" },
      { path: ["/m/category", "/m/product/x", "/m/product/y", "/m/cart"], ao: 0.84, readiness: 62, mobile: true, phase: "evaluation", conceptAffinity: { "cart checkout intent": 0.5 } },
    ],
  ),

  scenario(
    "health_education_first",
    "healthcare",
    "Education-first",
    "healthcare",
    ["Learning", "Understanding options", "Care context", "Guided next step"],
    [
      { path: ["/conditions/overview"], ao: 0.62, readiness: 44, posture: "observe_only", phase: "research" },
      { path: ["/conditions/overview", "/treatment-basics"], ao: 0.7, readiness: 50, posture: "observe_only", phase: "research" },
      { path: ["/conditions/overview", "/treatment-basics", "/what-to-expect"], ao: 0.78, readiness: 56, posture: "soft_cta_ready", phase: "comparison" },
      { path: ["/conditions/overview", "/treatment-basics", "/what-to-expect", "/schedule-info"], ao: 0.84, readiness: 62, posture: "soft_cta_ready", phase: "evaluation" },
    ],
  ),
  scenario(
    "health_eligibility",
    "healthcare",
    "Eligibility exploration",
    "healthcare",
    ["General browsing", "Cost / coverage questions", "Eligibility focus", "Measured assist"],
    [
      { path: ["/patients"], ao: 0.62, readiness: 44, phase: "research" },
      { path: ["/patients", "/insurance"], ao: 0.72, readiness: 52, phase: "comparison", conceptAffinity: { benefits: 0.5 } },
      { path: ["/patients", "/insurance", "/eligibility"], ao: 0.8, readiness: 58, phase: "evaluation", conceptAffinity: { eligibility: 0.62, coverage: 0.55 } },
      { path: ["/patients", "/insurance", "/eligibility", "/cost-estimate"], ao: 0.86, readiness: 64, phase: "validation" },
    ],
  ),
  scenario(
    "health_provider_earned",
    "healthcare",
    "Provider discussion earned",
    "healthcare",
    ["Self-serve education", "Deeper read", "Comparison maturity", "Provider prompt earned"],
    [
      { path: ["/find-care"], ao: 0.64, readiness: 46, posture: "observe_only", phase: "research" },
      { path: ["/find-care", "/specialists"], ao: 0.74, readiness: 54, phase: "comparison" },
      { path: ["/find-care", "/specialists", "/doctor-profiles"], ao: 0.82, readiness: 62, phase: "evaluation", comparison: true },
      {
        path: ["/find-care", "/specialists", "/doctor-profiles", "/book"],
        ao: 0.9,
        readiness: 72,
        posture: "hard_cta_ready",
        phase: "conversion_ready",
        conceptAffinity: { "next step": 0.58, compare: 0.48 },
      },
    ],
  ),
  scenario(
    "health_anxiety_suppression",
    "healthcare",
    "Anxiety suppression",
    "healthcare",
    ["Worried scanning", "Sensitive moment", "Urgent / scary cue withheld", "Steady tone"],
    [
      { path: ["/symptoms"], ao: 0.58, readiness: 40, posture: "observe_only", phase: "research", rapidScanner: true },
      { path: ["/symptoms", "/when-to-call"], ao: 0.62, readiness: 44, posture: "observe_only", phase: "research" },
      { path: ["/symptoms", "/when-to-call", "/urgent-care"], ao: 0.52, readiness: 38, posture: "avoid_interrupt", phase: "evaluation" },
      { path: ["/symptoms", "/when-to-call", "/urgent-care", "/calm-next-step"], ao: 0.68, readiness: 50, posture: "soft_cta_ready", phase: "validation" },
    ],
  ),
  scenario(
    "health_soft_next",
    "healthcare",
    "Soft next-step guidance",
    "healthcare",
    ["Anonymous read", "Building context", "No hard booking yet", "Soft step offered"],
    [
      { path: ["/programs"], ao: 0.6, readiness: 42, posture: "observe_only", phase: "research" },
      { path: ["/programs", "/eligibility-quiz"], ao: 0.68, readiness: 48, posture: "observe_only", phase: "comparison" },
      { path: ["/programs", "/eligibility-quiz", "/prepare-visit"], ao: 0.76, readiness: 56, posture: "soft_cta_ready", phase: "evaluation" },
      { path: ["/programs", "/eligibility-quiz", "/prepare-visit", "/checklist"], ao: 0.82, readiness: 60, posture: "soft_cta_ready", phase: "validation" },
    ],
  ),

  scenario(
    "fin_rate_comparison",
    "financial_services",
    "Rate comparison",
    "financial_services",
    ["General research", "Product compare", "APR focus", "Transparent compare assist"],
    [
      { path: ["/cards"], ao: 0.62, readiness: 44, phase: "research" },
      { path: ["/cards", "/compare"], ao: 0.74, readiness: 54, comparison: true, phase: "comparison" },
      { path: ["/cards", "/compare", "/rates-fees"], ao: 0.82, readiness: 60, comparison: true, phase: "evaluation", pricingViews: 1 },
      { path: ["/cards", "/compare", "/rates-fees", "/card-details"], ao: 0.88, readiness: 66, phase: "validation" },
    ],
  ),
  scenario(
    "fin_calculator",
    "financial_services",
    "Calculator exploration",
    "financial_services",
    ["Curiosity", "Playing with numbers", "Scenario depth", "Calculator next step"],
    [
      { path: ["/tools"], ao: 0.6, readiness: 42, phase: "research" },
      { path: ["/tools", "/loan-calculator"], ao: 0.72, readiness: 50, phase: "comparison", conceptAffinity: { calculator: 0.62 } },
      { path: ["/tools", "/loan-calculator", "/scenario-save"], ao: 0.8, readiness: 58, phase: "evaluation" },
      { path: ["/tools", "/loan-calculator", "/scenario-save", "/disclosures"], ao: 0.86, readiness: 64, phase: "validation" },
    ],
  ),
  scenario(
    "fin_trust_before_apply",
    "financial_services",
    "Trust-before-application",
    "financial_services",
    ["Early visit", "Security lens", "Eligibility read", "Application intentionally delayed"],
    [
      { path: ["/"], ao: 0.58, readiness: 40, posture: "observe_only", phase: "research" },
      { path: ["/", "/security"], ao: 0.68, readiness: 48, posture: "observe_only", phase: "comparison", conceptAffinity: { security: 0.58 } },
      { path: ["/", "/security", "/eligibility"], ao: 0.76, readiness: 54, posture: "soft_cta_ready", phase: "evaluation" },
      { path: ["/", "/security", "/eligibility", "/apply-start"], ao: 0.64, readiness: 48, posture: "avoid_interrupt", phase: "validation" },
    ],
  ),
  scenario(
    "fin_refinance",
    "financial_services",
    "Refinance evaluator",
    "financial_services",
    ["General intent", "Refi signals", "Payment focus", "Refinance-specific assist"],
    [
      { path: ["/borrow"], ao: 0.6, readiness: 42, phase: "research" },
      { path: ["/borrow", "/refinance"], ao: 0.74, readiness: 52, phase: "comparison", conceptAffinity: { refinance: 0.58 } },
      { path: ["/borrow", "/refinance", "/payment-estimate"], ao: 0.84, readiness: 60, phase: "evaluation", pricingViews: 1 },
      { path: ["/borrow", "/refinance", "/payment-estimate", "/disclosures"], ao: 0.88, readiness: 66, phase: "validation" },
    ],
  ),
  scenario(
    "fin_application_suppression",
    "financial_services",
    "Application suppression",
    "financial_services",
    ["High intent click", "Thin readiness", "Hard apply withheld", "Compliance pacing"],
    [
      { path: ["/apply"], ao: 0.68, readiness: 46, phase: "comparison", ctaClicks: 1 },
      { path: ["/apply", "/prequal"], ao: 0.58, readiness: 42, phase: "evaluation", ctaClicks: 2 },
      { path: ["/apply", "/prequal", "/documents"], ao: 0.42, readiness: 36, phase: "evaluation", rapidScanner: true },
      { path: ["/apply", "/prequal", "/documents", "/submit"], ao: 0.34, readiness: 32, phase: "validation", rapidScanner: true, posture: "avoid_interrupt" },
    ],
  ),

  scenario(
    "auto_inventory",
    "auto_retail",
    "Inventory exploration",
    "auto_retail",
    ["Lot browsing", "Filter / search", "Vehicle detail", "Availability assist"],
    [
      { path: ["/inventory"], ao: 0.62, readiness: 40, phase: "research", engagement: 40 },
      { path: ["/inventory", "/search"], ao: 0.7, readiness: 46, phase: "research", engagement: 46 },
      { path: ["/inventory", "/search", "/vdp"], ao: 0.78, readiness: 52, phase: "comparison", engagement: 50 },
      { path: ["/inventory", "/search", "/vdp", "/availability"], ao: 0.84, readiness: 58, phase: "evaluation", engagement: 54 },
    ],
  ),
  scenario(
    "auto_payment_focused",
    "auto_retail",
    "Payment-focused shopper",
    "auto_retail",
    ["Vehicle interest", "Payment curiosity", "Finance page depth", "Payment assist"],
    [
      { path: ["/vdp"], ao: 0.64, readiness: 44, phase: "comparison" },
      { path: ["/vdp", "/finance"], ao: 0.76, readiness: 52, phase: "evaluation", financeInteractions: 1, engagement: 50 },
      { path: ["/vdp", "/finance", "/payment-estimator"], ao: 0.84, readiness: 58, phase: "validation", engagement: 54 },
      { path: ["/vdp", "/finance", "/payment-estimator", "/lease-vs-finance"], ao: 0.88, readiness: 62, phase: "validation", engagement: 58 },
    ],
  ),
  scenario(
    "auto_trade_in",
    "auto_retail",
    "Trade-in comparison",
    "auto_retail",
    ["New car browse", "Equity curiosity", "Trade research", "Soft trade prompt"],
    [
      { path: ["/inventory"], ao: 0.6, readiness: 42, phase: "research" },
      { path: ["/inventory", "/vdp"], ao: 0.7, readiness: 48, phase: "comparison" },
      { path: ["/inventory", "/vdp", "/trade-value"], ao: 0.8, readiness: 56, phase: "evaluation", conceptAffinity: { "trade in": 0.62 } },
      { path: ["/inventory", "/vdp", "/trade-value", "/compare-offers"], ao: 0.86, readiness: 60, phase: "validation", comparison: true },
    ],
  ),
  scenario(
    "auto_test_drive_earned",
    "auto_retail",
    "Test-drive earned",
    "auto_retail",
    ["Researching", "Serious compare", "Intent steady", "Test drive offered"],
    [
      { path: ["/inventory"], ao: 0.64, readiness: 44, phase: "research", engagement: 44 },
      { path: ["/inventory", "/compare"], ao: 0.74, readiness: 52, phase: "comparison", engagement: 50, compareInteractions: 1 },
      { path: ["/inventory", "/compare", "/vdp"], ao: 0.82, readiness: 58, phase: "evaluation", engagement: 54 },
      {
        path: ["/inventory", "/compare", "/vdp", "/test-drive"],
        ao: 0.9,
        readiness: 66,
        phase: "conversion_ready",
        engagement: 58,
        conceptAffinity: { "test drive": 0.62 },
      },
    ],
  ),
  scenario(
    "auto_dealer_restraint",
    "auto_retail",
    "Dealer-contact restraint",
    "auto_retail",
    ["Early browse", "Not ready to talk", "Dealer CTA withheld", "Inventory-first pacing"],
    [
      { path: ["/inventory"], ao: 0.58, readiness: 38, posture: "observe_only", phase: "research", engagement: 36 },
      { path: ["/inventory", "/vdp"], ao: 0.62, readiness: 42, posture: "observe_only", phase: "research", engagement: 40 },
      { path: ["/inventory", "/vdp", "/contact"], ao: 0.48, readiness: 36, posture: "avoid_interrupt", phase: "comparison", engagement: 42, rapidScanner: true },
      { path: ["/inventory", "/vdp", "/contact", "/inventory"], ao: 0.55, readiness: 40, posture: "soft_cta_ready", phase: "comparison", engagement: 46 },
    ],
  ),
];
