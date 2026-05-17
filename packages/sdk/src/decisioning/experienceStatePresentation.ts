import type { ExperienceDecisionEnvelope, SessionProfile } from "@si/shared";
import { BUYER_RUNTIME_SIGNAL_STILL_GATHERING, isBuyerUnsafeString } from "./buyerCopySafety";
import type { DecisionTransitionReason, ReplayResult } from "./replay/types";

/** Canonical progression ladder (fixed ordering). */
export const EXPERIENCE_LADDER_LABELS = [
  "Exploring",
  "Evaluating",
  "Comparing",
  "Implementation-focused",
  "Escalation earned",
] as const;

export type ExperienceLadderState =
  | "exploring"
  | "evaluating"
  | "comparing"
  | "implementation_focused"
  | "escalation_earned";

const STATE_TO_INDEX: Record<ExperienceLadderState, number> = {
  exploring: 0,
  evaluating: 1,
  comparing: 2,
  implementation_focused: 3,
  escalation_earned: 4,
};

const LABEL_TO_STATE: Record<string, ExperienceLadderState> = {
  Exploring: "exploring",
  Evaluating: "evaluating",
  Comparing: "comparing",
  "Implementation-focused": "implementation_focused",
  "Escalation earned": "escalation_earned",
};

const TRANSITION_HINT: Record<DecisionTransitionReason, string> = {
  first_frame: "the replay established a baseline for this session",
  commercial_phase_advanced: "the commercial journey phase matured",
  comparison_behavior_detected: "comparison-style navigation became clearer",
  readiness_crossed_threshold: "interest crossed a point where softer guidance fits better",
  engagement_increased: "engagement deepened on recent pages",
  cta_engagement_increased: "calls-to-action drew more deliberate attention",
  pricing_signal_added: "pricing-oriented pages showed up in the path",
  escalation_stage_increased: "pacing memory recorded room for a stronger next step",
  suppression_due_to_low_confidence: "confidence was still building for a harder surface",
  progression_gate_blocked: "pacing intentionally held back a heavier step",
  progression_cooldown_active: "short pacing avoided repeating the same interruption",
  cooldown_active: "a brief pacing pause applied between visible prompts",
  decision_family_rotated: "the active guidance family rotated to match the new moment",
  surface_changed_same_family: "the recommended surface changed while the guidance theme stayed consistent",
  timing_escalated: "experience timing became slightly more assertive",
  timing_relaxed: "experience timing eased to stay patient",
  offer_angle_changed: "the offer framing shifted to match visitor context",
  no_decision_maintained: "the runtime maintained deliberate restraint",
};

function tidy(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function readinessFromProfile(profile: SessionProfile): number {
  return (
    profile.personalization_signal?.activation_readiness_score ??
    profile.personalization_signal?.conversion_readiness ??
    profile.behavior_snapshot?.activation_readiness.score_0_100 ??
    0
  );
}

/** Path/heuristic signals for implementation-aligned browsing (internal only). */
function implementationPathSignals(profile: SessionProfile): boolean {
  const paths = profile.signals?.path_sequence ?? [];
  const rx =
    /implementation|rollout|roll-out|eligib|calculat|config|onboard|deploy|migrate|adoption|stakeholder|integrat|readiness|checklist|fit\b|setup|security-review/i;
  if (paths.some((p) => rx.test(p))) return true;
  const vertical = profile.site_context?.vertical ?? "";
  const b2bStyleVertical = vertical === "b2b_saas" || vertical === "financial_services" || vertical === "healthcare";
  const offer = (profile.signals?.finance_interactions ?? 0) > 0 && (profile.signals?.form_field_focus_events ?? 0) > 0;
  if (b2bStyleVertical && offer) return true;
  return false;
}

function comparingSignals(profile: SessionProfile): boolean {
  const bs = profile.behavior_snapshot;
  if (bs?.navigation.comparison_behavior) return true;
  const phase = bs?.commercial_journey_phase ?? profile.commercial_journey_phase;
  if (phase === "comparison") return true;
  if ((profile.signals?.compare_interactions ?? 0) > 0) return true;
  if ((profile.signals?.pricing_views ?? 0) >= 2) return true;
  return false;
}

function isEscalationEarned(profile: SessionProfile, envelope: ExperienceDecisionEnvelope | null): boolean {
  const primary = envelope?.primary_decision ?? null;
  if (!primary) return false;
  const confOk = primary.confidence >= 0.72;
  if (!confOk) return false;
  const readiness = readinessFromProfile(profile);
  const intent = profile.intent_score ?? 0;
  const posture = profile.behavior_snapshot?.activation_readiness.interruption_posture;
  const stage = profile.experience_progression?.escalation_stage ?? 0;
  if (posture === "hard_cta_ready") return true;
  if (stage >= 2) return true;
  if (readiness >= 58 && intent >= 52) return true;
  return false;
}

/**
 * Single canonical ladder position from session + envelope (uses the same decision outcome the runtime surfaced).
 */
export function getExperienceState(
  profile: SessionProfile,
  envelope: ExperienceDecisionEnvelope | null,
  _replay?: ReplayResult | null,
): ExperienceLadderState {
  void _replay;
  if (isEscalationEarned(profile, envelope)) return "escalation_earned";

  const primary = envelope?.primary_decision ?? null;
  if (implementationPathSignals(profile)) return "implementation_focused";

  if (comparingSignals(profile)) return "comparing";

  const bs = profile.behavior_snapshot;
  const phase = bs?.commercial_journey_phase ?? profile.commercial_journey_phase;
  const pages = profile.signals?.pages_viewed ?? 0;
  const engagement = profile.engagement_score ?? 0;
  const deep = bs?.engagement_quality.label === "deep_reader";

  if (phase === "evaluation" || (pages >= 2 && (deep || engagement >= 44))) return "evaluating";

  return "exploring";
}

export function ladderLabel(state: ExperienceLadderState): string {
  return EXPERIENCE_LADDER_LABELS[STATE_TO_INDEX[state]]!;
}

export function getStateProgressionLadder(currentState: ExperienceLadderState): {
  steps: typeof EXPERIENCE_LADDER_LABELS;
  currentIndex: number;
} {
  return {
    steps: EXPERIENCE_LADDER_LABELS,
    currentIndex: STATE_TO_INDEX[currentState],
  };
}

/**
 * Buyer-facing escalation posture (no numeric confidence).
 * Labels: observing, cautious progression, validation-focused, soft CTA ready, escalation eligible, suppression preferred.
 */
export function getEscalationPosture(profile: SessionProfile, envelope: ExperienceDecisionEnvelope | null): string {
  const primary = envelope?.primary_decision ?? null;
  const bs = profile.behavior_snapshot;
  const posture = bs?.activation_readiness.interruption_posture;

  if (!primary) {
    if (posture === "observe_only") return "observing";
    if (envelope?.suppression_summary?.trim() || posture === "avoid_interrupt") return "suppression preferred";
    return "cautious progression";
  }

  if (posture === "observe_only") return "observing";

  if (posture === "avoid_interrupt") return "suppression preferred";

  if (posture === "soft_cta_ready") {
    return bs?.navigation.comparison_behavior ? "validation-focused" : "soft CTA ready";
  }

  if (posture === "hard_cta_ready") {
    return isEscalationEarned(profile, envelope) ? "escalation eligible" : "validation-focused";
  }

  return "cautious progression";
}

function lastReplayHints(replay: ReplayResult | null | undefined): string | null {
  const t = replay?.transitions?.length ? replay.transitions[replay.transitions.length - 1] : null;
  if (!t?.reasons.length) return null;
  const parts = t.reasons.map((r) => TRANSITION_HINT[r]).slice(0, 2);
  if (!parts.length) return null;
  return parts.join(" and ");
}

/** One sentence: why the runtime is in this ladder state (no scores/percentages in output). */
export function buildStateReason(
  profile: SessionProfile,
  envelope: ExperienceDecisionEnvelope | null,
  replay?: ReplayResult | null,
): string {
  const state = getExperienceState(profile, envelope, replay);
  const bs = profile.behavior_snapshot;
  const pages = profile.signals?.pages_viewed ?? 0;
  const readiness = readinessFromProfile(profile);
  const transitionHint = lastReplayHints(replay ?? null);
  const primary = envelope?.primary_decision ?? null;

  let core: string;
  switch (state) {
    case "escalation_earned":
      core =
        "readiness, intent, and pacing line up with a confident next step, and the runtime selected an appropriate surface without forcing suppression";
      break;
    case "implementation_focused":
      core =
        "the path and engagement look oriented toward setup, fit, eligibility, or rollout-style questions rather than only browsing";
      break;
    case "comparing":
      core = "comparison signals show up in navigation, paths, or product alternatives";
      break;
    case "evaluating":
      core =
        pages < 2
          ? "there is meaningful content engagement forming, but not a full comparison arc yet"
          : "multiple pages and steadier engagement suggest evaluation without a hard comparison lock-in yet";
      break;
    default:
      core =
        readiness < 48 || pages <= 1
          ? "the visit is still early, with lighter engagement and broad exploration"
          : "signals are still broad relative to a firmer commercial arc";
  }

  if (transitionHint) {
    core += `; ${transitionHint}`;
  }

  if (bs?.engagement_quality.label === "rapid_scanner" && state === "exploring") {
    core += "; movement is fast, so the runtime keeps guidance patient";
  }

  if (!primary && envelope?.suppression_summary?.trim()) {
    core += "; stronger surfaces are intentionally paused until the picture stabilizes";
  }

  return tidy(core);
}

/** One sentence: what would unlock escalation (no numeric thresholds in text). */
export function buildEscalationUnlockCondition(profile: SessionProfile, envelope: ExperienceDecisionEnvelope | null): string {
  const posture = getEscalationPosture(profile, envelope);
  const primary = envelope?.primary_decision ?? null;

  if (posture === "suppression preferred" || !primary) {
    return tidy(
      "interest firms up, engagement steadies, pacing allows a natural next step, and the visitor takes a clearer action on a well-matched surface",
    );
  }

  if (posture === "observing" || posture === "cautious progression") {
    return tidy(
      "the visitor keeps pulling commercial context forward (pages, questions, and light CTA engagement) until a softer step is clearly warranted",
    );
  }

  if (posture === "validation-focused" || posture === "soft CTA ready") {
    return tidy(
      "comparison or validation work completes and interruption posture moves from soft guidance to an earned stronger ask",
    );
  }

  return tidy("the session remains eligible — the runtime will only tighten timing if repetition or friction risks rise");
}

/** Full buyer sentences built on {@link buildStateReason} / {@link buildEscalationUnlockCondition}. */
export function buildRuntimeStayingSentence(
  profile: SessionProfile,
  envelope: ExperienceDecisionEnvelope | null,
  replay?: ReplayResult | null,
): string {
  const state = getExperienceState(profile, envelope, replay);
  const label = ladderLabel(state);
  const because = buildStateReason(profile, envelope, replay);
  return tidy(`The runtime is staying in ${label} because ${because}.`);
}

export function buildRuntimeEscalateIfSentence(
  profile: SessionProfile,
  envelope: ExperienceDecisionEnvelope | null,
): string {
  const fragment = buildEscalationUnlockCondition(profile, envelope);
  return tidy(`It would escalate if ${fragment.charAt(0).toLowerCase() + fragment.slice(1)}`);
}

/** Buyer-facing clause for the most recent replay transition (deterministic; no scores). */
export function describeLatestReplayTransition(replay: ReplayResult | null | undefined): string | null {
  const t = replay?.transitions?.length ? replay.transitions[replay.transitions.length - 1] : null;
  if (!t?.reasons.length) return null;
  const parts: string[] = [];
  for (const r of t.reasons.slice(0, 2)) {
    const hint = TRANSITION_HINT[r];
    if (!hint || isBuyerUnsafeString(hint)) return BUYER_RUNTIME_SIGNAL_STILL_GATHERING;
    parts.push(hint);
  }
  if (!parts.length) return BUYER_RUNTIME_SIGNAL_STILL_GATHERING;
  const out = tidy(`Changed because ${parts.join(" and ")}.`);
  return isBuyerUnsafeString(out) ? BUYER_RUNTIME_SIGNAL_STILL_GATHERING : out;
}

/** Map a ladder step label back to state (for scenario diff). */
export function ladderLabelToState(label: string): ExperienceLadderState | null {
  return LABEL_TO_STATE[label] ?? null;
}

/** Title-case for buyer UI; preserves phrasing like "Soft CTA ready". */
export function formatEscalationPostureForBuyer(s: string): string {
  const t = s.trim();
  if (!t) return t;
  if (t === "soft CTA ready") return "Soft CTA ready";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
