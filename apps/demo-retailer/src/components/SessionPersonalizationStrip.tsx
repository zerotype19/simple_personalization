import type { SessionProfile } from "@si/shared";
import { useEffect, useMemo, useState } from "react";
import { subscribe } from "@si/sdk";

const TREATMENT_LABELS: Record<string, string> = {
  t_high_intent: "High-intent urgency (hero CTA + subtext)",
  t_payment_sensitive: "Payment-sensitive messaging",
  t_family_buyer: "Family / SUV emphasis (promo module)",
  t_luxury_buyer: "Luxury positioning",
};

function stripVariant(p: SessionProfile): {
  key: "control" | "experiment" | "rules" | "mixed" | "pending_home" | "idle";
  title: string;
  borderClass: string;
  bgClass: string;
} {
  const exp = p.experiment_assignment;
  const at = p.active_treatments ?? [];
  const hasExp = at.some((t) => t.source === "experiment");
  const hasRule = at.some((t) => t.source === "rule");

  if (exp?.is_control) {
    return {
      key: "control",
      title: "A/B control — default experience",
      borderClass: "border-amber-500",
      bgClass: "bg-amber-950/40",
    };
  }

  if (exp?.treatment_id && at.length === 0 && p.page_type !== "home") {
    return {
      key: "pending_home",
      title: "Treatment assigned — hero personalization applies on Home",
      borderClass: "border-indigo-400",
      bgClass: "bg-indigo-950/35",
    };
  }

  if (hasExp && hasRule) {
    return {
      key: "mixed",
      title: "Live personalization — experiment + behavioral rules",
      borderClass: "border-fuchsia-500",
      bgClass: "bg-fuchsia-950/30",
    };
  }
  if (hasRule) {
    return {
      key: "rules",
      title: "Live personalization — driven by your session signals",
      borderClass: "border-emerald-500",
      bgClass: "bg-emerald-950/35",
    };
  }
  if (hasExp) {
    return {
      key: "experiment",
      title: "Live personalization — experiment treatment active",
      borderClass: "border-indigo-500",
      bgClass: "bg-indigo-950/40",
    };
  }

  return {
    key: "idle",
    title: "Session scoring active — interact to unlock rule-based copy",
    borderClass: "border-slate-600",
    bgClass: "bg-slate-900/50",
  };
}

export default function SessionPersonalizationStrip() {
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    try {
      return subscribe(setProfile);
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "SDK not ready");
      return undefined;
    }
  }, []);

  const variant = useMemo(() => (profile ? stripVariant(profile) : null), [profile]);

  if (bootError) return null;
  if (!profile || !variant) return null;

  const { signals } = profile;
  const exp = profile.experiment_assignment;
  const at = profile.active_treatments ?? [];

  return (
    <div
      className={`border-b border-l-4 ${variant.borderClass} ${variant.bgClass} border-slate-800`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Session Intelligence
              </span>
              <span className="font-semibold text-white">{variant.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Clicks on CTAs (<code className="text-indigo-200">data-si-cta</code>), price taps, finance/compare
              modules, routes, and scroll update scores. Treatments rewrite slots on{" "}
              <strong className="text-white">Home</strong> (and elsewhere when slots exist).
            </p>
            {at.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs text-slate-200">
                {at.map((t) => (
                  <li key={`${t.treatment_id}-${t.source}`}>
                    <span className="font-mono text-indigo-200">{t.treatment_id}</span>
                    <span className="text-slate-500"> · </span>
                    <span className="text-slate-400">{t.source}</span>
                    {TREATMENT_LABELS[t.treatment_id] ? (
                      <span className="text-slate-400"> — {TREATMENT_LABELS[t.treatment_id]}</span>
                    ) : null}
                    {t.applied_slots.length > 0 ? (
                      <span className="text-slate-500"> · slots: {t.applied_slots.join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : exp?.is_control ? (
              <p className="mt-1 text-xs text-amber-200/90">
                Control arm: no DOM treatments. Your clicks still build the session profile sent to{" "}
                <code className="rounded bg-black/30 px-1">/collect</code> for analytics and dashboard lift.
              </p>
            ) : null}
          </div>
          <details className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
            <summary className="cursor-pointer font-medium text-slate-200">Signals</summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
              <dt className="text-slate-500">intent</dt>
              <dd>{profile.intent_score.toFixed(0)}</dd>
              <dt className="text-slate-500">urgency</dt>
              <dd>{profile.urgency_score.toFixed(0)}</dd>
              <dt className="text-slate-500">engagement</dt>
              <dd>{profile.engagement_score.toFixed(0)}</dd>
              <dt className="text-slate-500">cta_clicks</dt>
              <dd>{signals.cta_clicks}</dd>
              <dt className="text-slate-500">finance_ix</dt>
              <dd>{signals.finance_interactions}</dd>
              <dt className="text-slate-500">pricing_views</dt>
              <dd>{signals.pricing_views}</dd>
              <dt className="text-slate-500">vdp_views</dt>
              <dd>{signals.vdp_views}</dd>
              <dt className="text-slate-500">page</dt>
              <dd>{profile.page_type}</dd>
              <dt className="text-slate-500">experiment</dt>
              <dd>{exp ? `${exp.variant_id} (${exp.is_control ? "control" : "treatment"})` : "—"}</dd>
            </dl>
          </details>
        </div>
      </div>
    </div>
  );
}
