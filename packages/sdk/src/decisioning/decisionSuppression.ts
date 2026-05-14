import type { ExperienceDecision, SessionProfile, SiteVertical } from "@si/shared";
import { findSurfaceEntry } from "./surfaceMatcher";
import type { ExperienceSurfaceCatalogFile } from "@si/shared";
import { frictionWithinMax } from "./decisionTiming";

const AGGRESSIVE_URGENCY = /(act now|disappearing|urgent|today only|immediately|slots disappearing)/i;
const FINANCE_UNSAFE = /(guaranteed approval|no credit check|everyone qualifies)/i;

export interface SuppressionResult {
  ok: boolean;
  reason?: string;
}

function isModalish(surfaceType?: string, surfaceId?: string): boolean {
  const s = `${surfaceType ?? ""} ${surfaceId ?? ""}`.toLowerCase();
  return s.includes("modal") || s.includes("popup") || s.includes("overlay");
}

export function shouldSuppressDecision(args: {
  profile: SessionProfile;
  vertical: SiteVertical;
  decision: ExperienceDecision;
  catalog: ExperienceSurfaceCatalogFile;
  /** Global confidence floor before surfacing primary (0–1). */
  globalFloor: number;
}): SuppressionResult {
  const { profile, vertical, decision, catalog, globalFloor } = args;
  const sig = profile.personalization_signal;
  const bs = profile.behavior_snapshot;
  const entry = findSurfaceEntry(catalog.surfaces, decision.surface_id);

  if (decision.confidence < globalFloor) {
    return { ok: false, reason: "below_global_confidence_floor" };
  }

  if (entry?.min_confidence != null && decision.confidence < entry.min_confidence) {
    return { ok: false, reason: "below_surface_confidence_threshold" };
  }

  const readiness = sig.activation_readiness_score ?? sig.conversion_readiness ?? 0;
  if (isModalish(decision.surface_type, decision.surface_id)) {
    const need = Math.max(0.72, 0.42 + readiness / 200);
    if (decision.confidence < need) {
      return { ok: false, reason: "modal_confidence_below_threshold" };
    }
  }

  if (!frictionWithinMax(decision.friction, entry?.max_friction)) {
    return { ok: false, reason: "friction_exceeds_surface_max" };
  }

  if (profile.signals.cta_clicks >= 2 && /demo|contact sales|book|schedule|apply/i.test(decision.cta_label)) {
    if (readiness < 45 && decision.friction === "high") {
      return { ok: false, reason: "hard_cta_after_click_without_readiness" };
    }
  }

  if (bs?.activation_readiness.interruption_posture === "avoid_interrupt" && isModalish(decision.surface_type)) {
    return { ok: false, reason: "avoid_interrupt_posture" };
  }

  if (bs?.activation_readiness.interruption_posture === "observe_only" && isModalish(decision.surface_type)) {
    return { ok: false, reason: "observe_only_blocks_modal" };
  }

  if (
    bs?.engagement_quality.label === "rapid_scanner" &&
    isModalish(decision.surface_type, decision.surface_id) &&
    decision.confidence < 0.78
  ) {
    return { ok: false, reason: "rapid_scanner_modal_suppressed" };
  }

  if (vertical === "healthcare") {
    const blob = `${decision.message_angle} ${decision.headline} ${decision.body} ${decision.offer_type}`;
    if (AGGRESSIVE_URGENCY.test(blob) || /flash_urgency|urgent_book/i.test(decision.source_recipe_id ?? "")) {
      return { ok: false, reason: "healthcare_aggressive_urgency_suppressed" };
    }
  }

  if (vertical === "financial_services") {
    const blob = `${decision.headline} ${decision.body} ${decision.offer_type}`;
    if (FINANCE_UNSAFE.test(blob)) {
      return { ok: false, reason: "financial_unsafe_claim_suppressed" };
    }
  }

  if (
    decision.confidence < 0.42 &&
    (decision.reason?.length ?? 0) < 1 &&
    (decision.evidence?.length ?? 0) < 1
  ) {
    return { ok: false, reason: "generic_decision_weak_evidence" };
  }

  if (decision.timing === "exit_intent" && (vertical === "healthcare" || vertical === "financial_services")) {
    return { ok: false, reason: "exit_intent_not_allowed_sensitive_vertical" };
  }

  if (decision.timing === "immediate" && decision.friction !== "low" && !/inline/i.test(decision.surface_type ?? "")) {
    return { ok: false, reason: "immediate_only_for_low_friction_inline" };
  }

  return { ok: true };
}

export function summarizeSuppression(reasons: string[]): string {
  if (!reasons.length) return "No strong experience decision for this session state (restraint).";
  const uniq = [...new Set(reasons)];
  return `Held back: ${uniq.join("; ")}.`;
}
