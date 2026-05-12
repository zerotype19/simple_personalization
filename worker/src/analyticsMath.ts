import type { ExperimentReport, VariantReport } from "@si/shared";

export function weightedAvg(a: number, wa: number, b: number, wb: number): number {
  const denom = wa + wb;
  if (denom <= 0) return 0;
  return (a * wa + b * wb) / denom;
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Merge seeded demo experiment stats with live D1 variant rows and recompute lift vs control.
 * Must match dashboard `/dashboard/experiments` behavior.
 */
export function mergeExperiment(demo: ExperimentReport, liveVariants?: Map<string, VariantReport>): ExperimentReport {
  if (!liveVariants || liveVariants.size === 0) return demo;

  const mergedVariants = demo.variants.map((v) => {
    const lv = liveVariants.get(v.id);
    if (!lv) return v;
    const sessions = v.sessions + lv.sessions;
    const cta_ctr = weightedAvg(v.cta_ctr, v.sessions, lv.cta_ctr, lv.sessions);
    const conversion_rate = weightedAvg(v.conversion_rate, v.sessions, lv.conversion_rate, lv.sessions);
    const avg_engagement = weightedAvg(v.avg_engagement, v.sessions, lv.avg_engagement, lv.sessions);
    return { ...v, sessions, cta_ctr, conversion_rate, avg_engagement };
  });

  const control = mergedVariants.find((x) => x.is_control);
  const treatment = mergedVariants.find((x) => !x.is_control);
  const lift_cta =
    control && treatment && control.cta_ctr > 0 ? (treatment.cta_ctr - control.cta_ctr) / control.cta_ctr : null;
  const lift_conversion =
    control && treatment && control.conversion_rate > 0
      ? (treatment.conversion_rate - control.conversion_rate) / control.conversion_rate
      : null;

  const withLift = mergedVariants.map((vv) => ({
    ...vv,
    lift_cta: vv.is_control ? null : lift_cta,
    lift_conversion: vv.is_control ? null : lift_conversion,
  }));

  return {
    ...demo,
    sessions: withLift.reduce((a, v) => a + v.sessions, 0),
    variants: withLift,
  };
}

/** Same semantics as `GET /dashboard/summary` D1 aggregate (per-session dedupe). */
export function aggregateDashboardSummary(
  rows: Array<{
    session_id: string;
    converted: number;
    intent_score: number;
    engagement_score: number;
  }>,
): { sessions_ingested: number; conversions: number; avg_intent: number; avg_engagement: number } {
  const perSession = new Map<
    string,
    { converted: number; intent_sum: number; intent_n: number; eng_sum: number; eng_n: number }
  >();
  for (const r of rows) {
    const cur = perSession.get(r.session_id) ?? {
      converted: 0,
      intent_sum: 0,
      intent_n: 0,
      eng_sum: 0,
      eng_n: 0,
    };
    cur.converted = Math.max(cur.converted, r.converted);
    cur.intent_sum += r.intent_score;
    cur.intent_n += 1;
    cur.eng_sum += r.engagement_score;
    cur.eng_n += 1;
    perSession.set(r.session_id, cur);
  }
  let conversions = 0;
  let intentAcc = 0;
  let engAcc = 0;
  const n = perSession.size;
  for (const s of perSession.values()) {
    if (s.converted >= 1) conversions += 1;
    intentAcc += s.intent_n > 0 ? s.intent_sum / s.intent_n : 0;
    engAcc += s.eng_n > 0 ? s.eng_sum / s.eng_n : 0;
  }
  return {
    sessions_ingested: n,
    conversions,
    avg_intent: n > 0 ? intentAcc / n : 0,
    avg_engagement: n > 0 ? engAcc / n : 0,
  };
}

/**
 * Mirrors D1 `handleExperiments` CTR for one variant bucket:
 * `SUM(cta_clicks) / SUM(pages)` over all ingested rows (not session-deduped).
 */
export function rollupVariantCtaCtr(rows: Array<{ cta_clicks: number; pages: number }>): number {
  const sumC = rows.reduce((a, r) => a + (Number.isFinite(r.cta_clicks) ? r.cta_clicks : 0), 0);
  const sumP = rows.reduce((a, r) => a + (Number.isFinite(r.pages) ? r.pages : 0), 0);
  if (sumP <= 0) return 0;
  return sumC / sumP;
}

/**
 * Mirrors D1 conversion_rate: distinct sessions with max(converted) ≥ 1,
 * divided by distinct session count in the bucket.
 */
export function rollupVariantConversionRate(rows: Array<{ session_id: string; converted: number }>): number {
  const perSession = new Map<string, number>();
  for (const r of rows) {
    const cur = perSession.get(r.session_id) ?? 0;
    perSession.set(r.session_id, Math.max(cur, r.converted));
  }
  const n = perSession.size;
  if (n <= 0) return 0;
  let conversions = 0;
  for (const v of perSession.values()) {
    if (v >= 1) conversions += 1;
  }
  return conversions / n;
}
