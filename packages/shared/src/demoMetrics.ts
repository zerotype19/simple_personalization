import type { ExperimentReport } from "./index";

/**
 * Canonical seeded experiment stats (merged with live D1 in the worker).
 * Inspector “lift preview” and worker `DEMO_EXPERIMENTS` must stay aligned.
 */
export function getDemoExperimentReports(): ExperimentReport[] {
  const lift_cta = (0.097 - 0.082) / 0.082;
  const lift_conversion = (0.021 - 0.018) / 0.018;
  return [
    {
      id: "exp_personalization_v1",
      name: "Velocity Personalization v1",
      status: "running",
      sessions: 12480,
      variants: [
        {
          id: "control",
          name: "Control",
          is_control: true,
          sessions: 6240,
          cta_ctr: 0.082,
          conversion_rate: 0.018,
          avg_engagement: 61.2,
          lift_cta: null,
          lift_conversion: null,
        },
        {
          id: "treatment",
          name: "Treatment",
          is_control: false,
          sessions: 6240,
          cta_ctr: 0.097,
          conversion_rate: 0.021,
          avg_engagement: 64.8,
          lift_cta,
          lift_conversion,
        },
      ],
    },
  ];
}

/** Percent strings for the inspector lift preview card (seed-only, no live pool). */
export function demoLiftPreviewCopy(): {
  ctaLine: string;
  leadLine: string;
} {
  const exp = getDemoExperimentReports()[0]!;
  const c = exp.variants.find((v) => v.is_control)!;
  const t = exp.variants.find((v) => !v.is_control)!;
  const liftCtaPct = t.lift_cta == null ? 0 : t.lift_cta * 100;
  const liftConvPct = t.lift_conversion == null ? 0 : t.lift_conversion * 100;
  return {
    ctaLine: `${(c.cta_ctr * 100).toFixed(1)}% → ${(t.cta_ctr * 100).toFixed(1)}% (+${Math.round(liftCtaPct)}%)`,
    leadLine: `${(c.conversion_rate * 100).toFixed(1)}% → ${(t.conversion_rate * 100).toFixed(1)}% (+${Math.round(liftConvPct)}%)`,
  };
}
