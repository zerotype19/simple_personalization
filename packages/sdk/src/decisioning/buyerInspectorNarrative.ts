import type {
  CommercialJourneyPhase,
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  SessionProfile,
} from "@si/shared";
import {
  buildRuntimeEscalateIfSentence,
  buildRuntimeStayingSentence,
  formatEscalationPostureForBuyer,
  getEscalationPosture,
  getExperienceState,
  getStateProgressionLadder,
  ladderLabel,
} from "./experienceStatePresentation";
import type { DecisionTransitionReason, ReplayResult } from "./replay/types";
import {
  BUYER_RUNTIME_SIGNAL_STILL_GATHERING,
  buyerSafeLineOrNull,
  filterBuyerSafeLines,
  isBuyerUnsafeString,
} from "./buyerCopySafety";
import { buildCommercialIntentDecisionReasons } from "./commercialIntentDecisionCoupling";
import { buyerSurfaceLabel } from "./buyerSurfaceLabels";

const BUYER_REASON_COPY: Record<DecisionTransitionReason, string> = {
  first_frame: "Baseline established for this session.",
  readiness_crossed_threshold: "Interest crossed a level where a guided next step fits better.",
  commercial_phase_advanced: "Commercial journey phase moved forward.",
  engagement_increased: "Engagement depth increased on recent pages.",
  cta_engagement_increased: "The visitor engaged with calls-to-action more actively.",
  pricing_signal_added: "Pricing-oriented pages appeared in the path.",
  comparison_behavior_detected: "Comparison-style navigation became clearer.",
  decision_family_rotated: "The type of guidance shifted to match the new moment in the visit.",
  surface_changed_same_family: "The recommended surface changed while staying in the same guidance theme.",
  timing_escalated: "Timing became slightly more assertive about when an experience can appear.",
  timing_relaxed: "Timing eased so interruptions stay patient.",
  offer_angle_changed: "The offer posture shifted to match visitor context.",
  escalation_stage_increased: "The session earned room for a stronger next step.",
  suppression_due_to_low_confidence: "A harder ask stayed back until confidence improves.",
  progression_gate_blocked: "A pacing boundary kept a heavier step from landing yet.",
  progression_cooldown_active: "A short pause between prompts avoided repeating the same interruption.",
  cooldown_active: "A short pause between prompts kept repetition in check.",
  no_decision_maintained: "The runtime kept restraint on purpose rather than forcing a new CTA.",
};

/** Structured copy for the buyer-facing inspector (no DOM). */
export interface BuyerInspectorView {
  commercialRead: string;
  recommended: {
    show: string;
    surface: string;
    timing: string;
    escalationPosture: string;
    confidenceChip: string | null;
    /** Buyer reassurance when there is no primary decision (null when a primary exists). */
    restraintBody: string | null;
  };
  /** False when the envelope has no primary experience decision. */
  hasPrimaryExperience: boolean;
  whyBullets: string[];
  /** When restraint applies — highest-leverage buyer section. */
  withheld: string[];
  progression: { steps: readonly string[]; currentIndex: number };
  whatChanged: string | null;
  families: { primary: string | null; secondary: string | null };
  /** Numeric confidence is intentionally omitted from buyer-facing UI (`recommended.confidenceChip` is always null). */
  statePresentation: {
    currentStateLabel: string;
    ladder: { steps: readonly string[]; currentIndex: number };
    escalationPosture: string;
    whyThisState: string;
    whatWouldMoveForward: string;
    strongerActionWithheld: string | null;
  };
}

function hasLeakage(s: string): boolean {
  if (/%/.test(s)) return true;
  if (/\b\d+\s*\/\s*100\b/.test(s)) return true;
  if (/\breadiness[_\s]?score\b/i.test(s)) return true;
  if (/\bmomentum\b/i.test(s)) return true;
  if (/\bthreshold\b.*\d/i.test(s)) return true;
  if (isBuyerUnsafeString(s)) return true;
  return false;
}

function tidySentence(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function humanPhase(phase: CommercialJourneyPhase | undefined): string {
  if (!phase) return "an early exploration";
  const map: Record<CommercialJourneyPhase, string> = {
    discovery: "early exploration",
    research: "research without a hard commitment yet",
    comparison: "active comparison shopping",
    evaluation: "structured evaluation of options",
    validation: "late validation before committing",
    conversion_ready: "a decisive-moment posture when the offer fits",
    retention_interest: "ongoing relationship interest",
    support_service: "service or support-seeking context",
  };
  return map[phase] ?? phase.replace(/_/g, " ");
}

function humanTiming(timing: ExperienceDecision["timing"]): string {
  switch (timing) {
    case "immediate":
      return "As soon as eligibility is met";
    case "after_scroll":
      return "After sustained reading on this page";
    case "next_navigation":
      return "On the next page view";
    case "exit_intent":
      return "Near exit intent, only when appropriate";
    case "idle":
      return "After a short quiet moment";
    default:
      return "Timed to match how this surface should interrupt";
  }
}

function humanFamily(f: string | undefined): string | null {
  if (!f) return null;
  const pretty = f.replace(/_/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function buildCommercialRead(
  profile: SessionProfile,
  primary: ExperienceDecision | null,
  envelope: ExperienceDecisionEnvelope | null,
): string {
  const bs = profile.behavior_snapshot;
  const phase = bs?.commercial_journey_phase ?? profile.commercial_journey_phase;
  const phaseWords = humanPhase(phase);

  if (!bs) {
    return "Session signals are still warming; commercial read will clarify after another page or two.";
  }

  const parts: string[] = [];
  if (bs.navigation.comparison_behavior) {
    parts.push("Comparison posture is visible in how they move across pages.");
  }
  if (bs.engagement_quality.label === "deep_reader") {
    parts.push("They are reading with depth rather than skimming.");
  } else if (bs.engagement_quality.label === "rapid_scanner") {
    parts.push("They are moving quickly across surfaces.");
  }

  let core = `Visitor appears to be in ${phaseWords}`;
  if (parts.length) core += ` — ${parts.join(" ")}`;
  core += ".";

  if (!primary && envelope?.suppression_summary?.trim()) {
    core += " The runtime is prioritizing restraint until the moment is clearer.";
  } else if (primary) {
    core += " The next step favors practical guidance that matches that posture.";
  }

  if (!primary) {
    const posture = bs.activation_readiness.interruption_posture;
    const deep = bs.engagement_quality.label === "deep_reader";
    const eng = profile.engagement_score ?? 0;
    if ((deep || eng >= 65) && (posture === "avoid_interrupt" || posture === "observe_only")) {
      core +=
        " Strong engagement is present, but interruption is withheld because the visit still reads as research-heavy without a decisive commercial action.";
    }
  }

  return tidySentence(core);
}

function buildRestraintBody(profile: SessionProfile, envelope: ExperienceDecisionEnvelope | null): string {
  const bs = profile.behavior_snapshot;
  const posture = bs?.activation_readiness.interruption_posture;
  const deep = bs?.engagement_quality.label === "deep_reader";
  const eng = profile.engagement_score ?? 0;
  const ladderish =
    (profile.personalization_signal?.activation_readiness_score ?? bs?.activation_readiness.score_0_100 ?? 0) >= 72;
  if ((deep || eng >= 70 || ladderish) && (posture === "avoid_interrupt" || envelope?.suppression_summary?.trim())) {
    return "Engagement is high, but a stronger interruption is not earned yet.";
  }
  return "The runtime is withholding interruption until the session shows a sharper commercial signal.";
}

function sanitizeBullet(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (hasLeakage(s)) return null;
  if (/^recipe\s+/i.test(s)) return null;
  if (/^[a-z][a-z0-9_]*$/i.test(s) && s.includes("_")) return null;
  return s;
}

function buildWhyBullets(profile: SessionProfile, primary: ExperienceDecision | null): string[] {
  const bs = profile.behavior_snapshot;
  const out: string[] = [];

  if (bs?.navigation.comparison_behavior) {
    out.push("Comparison-oriented navigation across recent pages.");
  }
  if (bs?.engagement_quality.label === "deep_reader") {
    out.push("Sustained deep reading behavior on content.");
  }
  if (bs && (profile.signals?.cta_clicks ?? 0) < 1) {
    out.push("No strong sales CTA clicks logged yet this session.");
  }
  if ((profile.page_journey?.length ?? 0) >= 2) {
    out.push("Multiple pages explored in this visit.");
  }

  if (profile.commercial_intent) {
    for (const r of buildCommercialIntentDecisionReasons(profile, primary)) {
      const b = sanitizeBullet(r);
      if (b && !out.includes(b)) out.push(b);
      if (out.length >= 5) break;
    }
  }

  if (primary?.reason?.length) {
    for (const r of primary.reason) {
      const b = sanitizeBullet(r);
      if (b && !out.includes(b)) out.push(b);
      if (out.length >= 5) break;
    }
  }

  if (bs?.activation_readiness.rationale?.length) {
    for (const r of bs.activation_readiness.rationale) {
      const b = sanitizeBullet(r);
      if (b && !out.includes(b)) out.push(b);
      if (out.length >= 5) break;
    }
  }

  const uniq = [...new Set(out)];
  return uniq.slice(0, 5);
}

function buildWithheld(
  profile: SessionProfile,
  primary: ExperienceDecision | null,
  envelope: ExperienceDecisionEnvelope | null,
): string[] {
  const lines: string[] = [];
  if (!primary) {
    const posture = profile.behavior_snapshot?.activation_readiness.interruption_posture;
    if (lines.length === 0 && posture === "avoid_interrupt") {
      lines.push("Heavier prompts stay back when the tab is often in the background or navigation stays exploratory.");
    }
    return lines.slice(0, 4);
  }

  if (primary.action === "suppress" && primary.suppression_reason?.trim()) {
    const sr = primary.suppression_reason.trim();
    if (!hasLeakage(sr)) {
      lines.push(`${buyerSurfaceLabel(primary.surface_id)} held back: ${sr}`);
    }
  }

  const posture = profile.behavior_snapshot?.activation_readiness.interruption_posture;
  if (lines.length === 0 && posture === "avoid_interrupt") {
    lines.push("Heavier interruptions avoided: current posture favors a lighter touch.");
  }

  if (lines.length === 0 && primary.friction === "high") {
    lines.push("Higher-friction treatment held back until pacing supports it.");
  }

  return lines.slice(0, 4);
}

function buildFamilies(profile: SessionProfile): { primary: string | null; secondary: string | null } {
  const mem = profile.experience_progression;
  const fams = mem?.recent_decision_families?.filter(Boolean) ?? [];
  if (fams.length === 0) return { primary: null, secondary: null };
  const secondary = fams.length >= 2 ? humanFamily(fams[fams.length - 2]!) : null;
  const primary = humanFamily(fams[fams.length - 1]!);
  return { primary, secondary };
}

function buildWhatChanged(replay: ReplayResult | null): string | null {
  if (!replay?.transitions?.length) return null;
  const t = replay.transitions[replay.transitions.length - 1]!;
  if (!t.reasons.length) return null;
  const parts: string[] = [];
  for (const c of t.reasons.slice(0, 2)) {
    const phrase = BUYER_REASON_COPY[c];
    if (!phrase || isBuyerUnsafeString(phrase)) return BUYER_RUNTIME_SIGNAL_STILL_GATHERING;
    parts.push(phrase);
  }
  if (!parts.length) return BUYER_RUNTIME_SIGNAL_STILL_GATHERING;
  const out = tidySentence(`Shift detected: ${parts.join(" ")}`);
  return buyerSafeLineOrNull(out) ?? BUYER_RUNTIME_SIGNAL_STILL_GATHERING;
}

/**
 * Deterministic buyer narrative for the inspector (fixtures-friendly, no LLM).
 */
export function buildBuyerInspectorView(
  profile: SessionProfile,
  envelope: ExperienceDecisionEnvelope | null,
  replay: ReplayResult | null,
): BuyerInspectorView {
  const primary = envelope?.primary_decision ?? null;
  const hasPrimaryExperience = !!primary;

  const commercialRead = buildCommercialRead(profile, primary, envelope);

  const recommended = primary
    ? {
        show: primary.headline?.trim() || primary.offer_type.replace(/_/g, " "),
        surface: buyerSurfaceLabel(primary.surface_id),
        timing: humanTiming(primary.timing),
        escalationPosture: formatEscalationPostureForBuyer(getEscalationPosture(profile, envelope)),
        confidenceChip: null,
        restraintBody: null,
      }
    : {
        show: "Restraint recommended",
        surface: "None for this moment",
        timing: "Until a decisive commercial action is visible",
        escalationPosture: formatEscalationPostureForBuyer(getEscalationPosture(profile, envelope)),
        confidenceChip: null,
        restraintBody: buildRestraintBody(profile, envelope),
      };

  const whyBullets = filterBuyerSafeLines(buildWhyBullets(profile, primary));
  const withheld = filterBuyerSafeLines(buildWithheld(profile, primary, envelope));
  const expState = getExperienceState(profile, envelope, replay);
  const progression = getStateProgressionLadder(expState);
  const whatChanged = buildWhatChanged(replay);
  const familiesRaw = buildFamilies(profile);
  const families = {
    primary: buyerSafeLineOrNull(familiesRaw.primary),
    secondary: buyerSafeLineOrNull(familiesRaw.secondary),
  };

  const statePresentation = {
    currentStateLabel: buyerSafeLineOrNull(ladderLabel(expState)) ?? ladderLabel(expState),
    ladder: progression,
    escalationPosture:
      buyerSafeLineOrNull(formatEscalationPostureForBuyer(getEscalationPosture(profile, envelope))) ??
      formatEscalationPostureForBuyer(getEscalationPosture(profile, envelope)),
    whyThisState:
      buyerSafeLineOrNull(buildRuntimeStayingSentence(profile, envelope, replay)) ??
      BUYER_RUNTIME_SIGNAL_STILL_GATHERING,
    whatWouldMoveForward:
      buyerSafeLineOrNull(buildRuntimeEscalateIfSentence(profile, envelope)) ??
      "Keep browsing — a clearer next step will emerge when the visit firms up.",
    strongerActionWithheld: null,
  };

  const commercialReadSafe =
    buyerSafeLineOrNull(commercialRead) ??
    "Session signals are still clarifying; the commercial read will sharpen after a little more browsing.";

  const recommendedSafe = hasPrimaryExperience
    ? {
        ...recommended,
        show: buyerSafeLineOrNull(recommended.show) ?? recommended.show,
        surface: buyerSafeLineOrNull(recommended.surface) ?? recommended.surface,
        timing: buyerSafeLineOrNull(recommended.timing) ?? recommended.timing,
        escalationPosture:
          buyerSafeLineOrNull(recommended.escalationPosture) ?? recommended.escalationPosture,
        restraintBody: recommended.restraintBody,
      }
    : {
        ...recommended,
        show: buyerSafeLineOrNull(recommended.show) ?? recommended.show,
        surface: buyerSafeLineOrNull(recommended.surface) ?? recommended.surface,
        timing: buyerSafeLineOrNull(recommended.timing) ?? recommended.timing,
        escalationPosture:
          buyerSafeLineOrNull(recommended.escalationPosture) ?? recommended.escalationPosture,
        restraintBody: buyerSafeLineOrNull(recommended.restraintBody ?? ""),
      };

  return {
    hasPrimaryExperience,
    commercialRead: commercialReadSafe,
    recommended: recommendedSafe,
    whyBullets,
    withheld,
    progression,
    whatChanged,
    families,
    statePresentation,
  };
}

/** Concatenate buyer-facing narrative fields for automated scans (tests). */
export function joinBuyerInspectorNarrativeForTests(view: BuyerInspectorView): string {
  const sp = view.statePresentation;
  const rec = view.recommended;
  return [
    view.commercialRead,
    rec.show,
    rec.surface,
    rec.timing,
    rec.escalationPosture,
    rec.restraintBody ?? "",
    ...view.whyBullets,
    ...view.withheld,
    sp.currentStateLabel,
    sp.whyThisState,
    sp.whatWouldMoveForward,
    sp.strongerActionWithheld ?? "",
    view.whatChanged ?? "",
    view.families.primary ?? "",
    view.families.secondary ?? "",
  ].join("\n");
}

/** Returns a short reason if any buyer string fails the credibility bar; otherwise null. */
export function buyerInspectorNarrativeCredibilityIssue(view: BuyerInspectorView): string | null {
  const blob = joinBuyerInspectorNarrativeForTests(view);
  if (isBuyerUnsafeString(blob)) return "unsafe buyer phrase";
  if (/%/.test(blob)) return "percent sign";
  return null;
}
