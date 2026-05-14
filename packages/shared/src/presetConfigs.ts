import type { SDKConfig } from "./index";

/**
 * Neutral defaults baked into the hosted `si.js` IIFE and returned by `GET /config`
 * unless the caller opts into the retail demo (see worker `?demo=velocity`).
 * Treatments use `applies_when: "false"` so third-party sites never get DOM rewrites
 * from this config alone (auto-retail still uses runtime vertical + optional demo config).
 */
export const GENERIC_HOSTED_SDK_CONFIG: SDKConfig = {
  inspector_enabled: true,
  collect_endpoint: null,
  config_endpoint: null,
  thresholds: {
    high_intent: 70,
    high_urgency: 60,
    high_engagement: 65,
  },
  experiments: [
    {
      id: "exp_personalization_v1",
      name: "Session Intelligence baseline experiment",
      status: "running",
      audience_when: "true",
      variants: [
        { id: "control", name: "Control", weight: 50, treatment_id: null },
        {
          id: "treatment",
          name: "Treatment",
          weight: 50,
          treatment_id: "t_high_intent",
        },
      ],
    },
  ],
  treatments: [
    {
      id: "t_high_intent",
      name: "Baseline treatment shell (disabled in generic config)",
      applies_when: "false",
      selectors: [
        { slot: "hero-cta", op: "text", value: "Continue" },
        { slot: "hero-sub", op: "text", value: "Explore the site — we keep this session anonymous." },
        { slot: "hero-cta", op: "addClass", value: "si-pulse" },
      ],
    },
    {
      id: "t_value_message",
      name: "Value-message shell (disabled in generic config)",
      applies_when: "false",
      selectors: [
        { slot: "hero-sub", op: "text", value: "See pricing and options that match your visit." },
        { slot: "hero-cta", op: "text", value: "View pricing" },
      ],
    },
    {
      id: "t_related_content",
      name: "Related-content shell (disabled in generic config)",
      applies_when: "false",
      selectors: [
        { slot: "promo-title", op: "text", value: "Popular picks for your visit" },
        { slot: "promo-body", op: "text", value: "We highlight what you engage with most in this session." },
      ],
    },
    {
      id: "t_premium_or_priority",
      name: "Priority positioning shell (disabled in generic config)",
      applies_when: "false",
      selectors: [
        { slot: "hero-sub", op: "text", value: "Premium options are available when intent is high." },
      ],
    },
  ],
  rules: [],
};

/** Velocity Motors demo site — opt in via Worker `GET /config?demo=velocity` (demo-retailer build). */
export const VELOCITY_RETAIL_DEMO_SDK_CONFIG: SDKConfig = {
  inspector_enabled: true,
  collect_endpoint: null,
  config_endpoint: null,
  thresholds: {
    high_intent: 70,
    high_urgency: 60,
    high_engagement: 65,
  },
  experiments: [
    {
      id: "exp_personalization_v1",
      name: "Session Intelligence demo cohort (retail benchmark)",
      status: "running",
      audience_when: "true",
      variants: [
        { id: "control", name: "Control", weight: 50, treatment_id: null },
        {
          id: "treatment",
          name: "Treatment",
          weight: 50,
          treatment_id: "t_high_intent",
        },
      ],
    },
  ],
  treatments: [
    {
      id: "t_high_intent",
      name: "High intent urgency CTA",
      applies_when: "intent >= 70 && urgency >= 50",
      selectors: [
        {
          slot: "hero-cta",
          op: "text",
          value: "Schedule your test drive — slots fill fast",
        },
        {
          slot: "hero-sub",
          op: "text",
          value: "We reserved priority concierge for high-intent shoppers today.",
        },
        {
          slot: "hero-cta",
          op: "addClass",
          value: "si-pulse",
        },
      ],
    },
    {
      id: "t_payment_sensitive",
      name: "Payment sensitive messaging",
      applies_when: "finance_interactions >= 1 || pricing_views >= 2",
      selectors: [
        {
          slot: "hero-sub",
          op: "text",
          value: "Lock a payment you love — explore lease & finance specials.",
        },
        {
          slot: "hero-cta",
          op: "text",
          value: "See monthly payments & incentives",
        },
      ],
    },
    {
      id: "t_family_buyer",
      name: "Family SUV emphasis",
      applies_when: "affinity.suv >= 0.35 && affinity.safety >= 0.2",
      selectors: [
        {
          slot: "promo-title",
          op: "text",
          value: "Family-ready SUVs with top safety scores",
        },
        {
          slot: "promo-body",
          op: "text",
          value: "3-row space, advanced driver assists, and flexible financing.",
        },
      ],
    },
    {
      id: "t_luxury_buyer",
      name: "Luxury emphasis",
      applies_when: "affinity.luxury >= 0.3",
      selectors: [
        {
          slot: "hero-sub",
          op: "text",
          value: "Experience white-glove delivery for premium trims.",
        },
      ],
    },
  ],
  rules: [
    {
      id: "r_high_intent_persona",
      when: "pricing_views >= 2 && return_visit == true && duration_s > 90",
      set: { persona: "high_intent" },
      recommend: {
        next_best_action: "Promote schedule test drive with urgency",
        treatment_hint: "high_intent",
        confidence: 0.82,
        reason: [],
      },
    },
    {
      id: "r_payment_sensitive",
      when: "finance_interactions >= 1 || pricing_views >= 2",
      set: { persona: "payment_sensitive" },
      recommend: {
        next_best_action: "Prioritize financing + monthly payment clarity",
        treatment_hint: "payment_sensitive",
        confidence: 0.74,
        reason: [],
      },
    },
    {
      id: "r_family_buyer",
      when: "affinity.suv >= 0.35 && affinity.safety >= 0.15",
      set: { persona: "family_buyer" },
      recommend: {
        next_best_action: "Promote family SUV test-drive CTA",
        treatment_hint: "family_buyer",
        confidence: 0.7,
        reason: [],
      },
    },
    {
      id: "r_luxury_buyer",
      when: "affinity.luxury >= 0.3",
      set: { persona: "luxury_buyer" },
      recommend: {
        next_best_action: "Highlight premium trims & concierge",
        treatment_hint: "luxury_buyer",
        confidence: 0.68,
        reason: [],
      },
    },
  ],
};
