import type { ExperimentReport, SiteVertical } from "./index";

export interface DemoLiftPreview {
  /** Short cohort name for UI copy */
  cohortLabel: string;
  ctaMetricLabel: string;
  leadMetricLabel: string;
  ctaLine: string;
  leadLine: string;
}

interface LiftSeed {
  cohortLabel: string;
  ctaMetricLabel: string;
  leadMetricLabel: string;
  control: { cta_ctr: number; conversion_rate: number; avg_engagement: number };
  treatment: { cta_ctr: number; conversion_rate: number; avg_engagement: number };
  sessions: number;
}

const RETAIL_SEED: LiftSeed = {
  cohortLabel: "Session Intelligence demo cohort (retail benchmark)",
  ctaMetricLabel: "CTA CTR",
  leadMetricLabel: "Lead submit",
  control: { cta_ctr: 0.082, conversion_rate: 0.018, avg_engagement: 61.2 },
  treatment: { cta_ctr: 0.097, conversion_rate: 0.021, avg_engagement: 64.8 },
  sessions: 6240,
};

const B2B_SEED: LiftSeed = {
  cohortLabel: "Session Intelligence demo cohort (B2B / SaaS benchmark)",
  ctaMetricLabel: "Guide / demo CTA engagement",
  leadMetricLabel: "Lead form start",
  control: { cta_ctr: 0.031, conversion_rate: 0.012, avg_engagement: 58 },
  treatment: { cta_ctr: 0.037, conversion_rate: 0.014, avg_engagement: 62 },
  sessions: 4100,
};

const ECOMMERCE_SEED: LiftSeed = {
  cohortLabel: "Session Intelligence demo cohort (e-commerce benchmark)",
  ctaMetricLabel: "Primary product CTA",
  leadMetricLabel: "Add-to-cart start",
  control: { cta_ctr: 0.045, conversion_rate: 0.032, avg_engagement: 52 },
  treatment: { cta_ctr: 0.052, conversion_rate: 0.036, avg_engagement: 56 },
  sessions: 8800,
};

const PUBLISHER_SEED: LiftSeed = {
  cohortLabel: "Session Intelligence demo cohort (publisher benchmark)",
  ctaMetricLabel: "In-article CTA / module",
  leadMetricLabel: "Newsletter signup",
  control: { cta_ctr: 0.021, conversion_rate: 0.009, avg_engagement: 48 },
  treatment: { cta_ctr: 0.025, conversion_rate: 0.011, avg_engagement: 53 },
  sessions: 5200,
};

const GENERAL_BUSINESS_SEED: LiftSeed = {
  cohortLabel: "Session Intelligence demo cohort (general / mixed vertical benchmark)",
  ctaMetricLabel: "Primary engagement CTA",
  leadMetricLabel: "Lead or conversion start",
  control: { cta_ctr: 0.038, conversion_rate: 0.014, avg_engagement: 54 },
  treatment: { cta_ctr: 0.044, conversion_rate: 0.016, avg_engagement: 58 },
  sessions: 5000,
};

function pickLiftSeed(vertical: SiteVertical): LiftSeed {
  if (vertical === "auto_retail" || vertical === "auto_oem") return RETAIL_SEED;
  if (vertical === "ecommerce") return ECOMMERCE_SEED;
  if (vertical === "publisher_content") return PUBLISHER_SEED;
  if (vertical === "b2b_saas" || vertical === "lead_generation" || vertical === "professional_services") {
    return B2B_SEED;
  }
  return GENERAL_BUSINESS_SEED;
}

function experimentFromSeed(seed: LiftSeed): ExperimentReport {
  const { control, treatment, sessions } = seed;
  const lift_cta = (treatment.cta_ctr - control.cta_ctr) / control.cta_ctr;
  const lift_conversion =
    (treatment.conversion_rate - control.conversion_rate) / control.conversion_rate;
  return {
    id: "exp_personalization_v1",
    name: seed.cohortLabel,
    status: "running",
    sessions: sessions * 2,
    variants: [
      {
        id: "control",
        name: "Control",
        is_control: true,
        sessions,
        cta_ctr: control.cta_ctr,
        conversion_rate: control.conversion_rate,
        avg_engagement: control.avg_engagement,
        lift_cta: null,
        lift_conversion: null,
      },
      {
        id: "treatment",
        name: "Treatment",
        is_control: false,
        sessions,
        cta_ctr: treatment.cta_ctr,
        conversion_rate: treatment.conversion_rate,
        avg_engagement: treatment.avg_engagement,
        lift_cta,
        lift_conversion,
      },
    ],
  };
}

/**
 * Canonical seeded experiment stats (merged with live D1 in the worker).
 * Inspector “lift preview” and worker `DEMO_EXPERIMENTS` must stay aligned — **retail** pool for dashboard parity.
 */
export function getDemoExperimentReports(): ExperimentReport[] {
  return [experimentFromSeed(RETAIL_SEED)];
}

/**
 * Seeded lift lines for the inspector, matched to inferred vertical (non-retail avoids retail-only language).
 */
export function demoLiftPreviewCopy(vertical: SiteVertical = "auto_retail"): DemoLiftPreview {
  const seed = pickLiftSeed(vertical);
  const c = seed.control;
  const t = seed.treatment;
  const liftCtaPct = ((t.cta_ctr - c.cta_ctr) / c.cta_ctr) * 100;
  const liftConvPct = ((t.conversion_rate - c.conversion_rate) / c.conversion_rate) * 100;
  return {
    cohortLabel: seed.cohortLabel,
    ctaMetricLabel: seed.ctaMetricLabel,
    leadMetricLabel: seed.leadMetricLabel,
    ctaLine: `${(c.cta_ctr * 100).toFixed(1)}% → ${(t.cta_ctr * 100).toFixed(1)}% (+${Math.round(liftCtaPct)}%)`,
    leadLine: `${(c.conversion_rate * 100).toFixed(1)}% → ${(t.conversion_rate * 100).toFixed(1)}% (+${Math.round(liftConvPct)}%)`,
  };
}
