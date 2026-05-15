import type {
  CommercialJourneyPhase,
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  SessionProfile,
} from "@si/shared";
import type { ReplayResult } from "./replay/types";

const LADDER: readonly string[] = [
  "Exploring",
  "Evaluating",
  "Comparing",
  "Implementation-focused",
  "Escalation earned",
] as const;

const BUYER_REASON_COPY: Partial<Record<string, string>> = {
  first_frame: "Baseline established for this session.",
  readiness_crossed_threshold: "Activation readiness crossed a threshold where a guided next step fits better.",
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
  progression_gate_blocked: "Pacing gates intentionally held back a heavier escalation.",
  progression_cooldown_active: "Cooldown pacing avoided repeating the same interruption.",
  cooldown_active: "A short cool-down window kept repetition in check.",
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
  };
  whyBullets: string[];
  /** When restraint applies — highest-leverage buyer section. */
  withheld: string[];
  progression: { steps: readonly string[]; currentIndex: number };
  whatChanged: string | null;
  families: { primary: string | null; secondary: string | null };
}

function hasLeakage(s: string): boolean {
  if (/%/.test(s)) return true;
  if (/\b\d+\s*\/\s*100\b/.test(s)) return true;
  if (/\breadiness[_\s]?score\b/i.test(s)) return true;
  if (/\bmomentum\b/i.test(s)) return true;
  if (/\bthreshold\b.*\d/i.test(s)) return true;
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
    conversion_ready: "readiness to convert if the offer fits",
    retention_interest: "ongoing relationship interest",
    support_service: "service or support-seeking context",
  };
  return map[phase] ?? phase.replace(/_/g, " ");
}

function humanSurface(surfaceId: string): string {
  return surfaceId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

function confidenceChip(conf: number | null | undefined): string | null {
  if (conf == null || Number.isNaN(conf)) return null;
  if (conf >= 0.72) return "High confidence";
  if (conf >= 0.45) return "Medium confidence";
  return "Building confidence";
}

function escalationPostureLabel(
  profile: SessionProfile,
  primary: ExperienceDecision | null,
  envelope: ExperienceDecisionEnvelope | null,
): string {
  if (!primary && envelope?.suppression_summary?.trim()) return "Suppression preferred";
  const bs = profile.behavior_snapshot;
  const posture = bs?.activation_readiness.interruption_posture;
  if (posture === "avoid_interrupt") return "Suppression preferred";
  if (!primary) return "Cautious progression";
  if (posture === "observe_only") return "Exploratory";
  if (posture === "soft_cta_ready") {
    return bs?.navigation.comparison_behavior ? "Validation-focused" : "Cautious progression";
  }
  if (posture === "hard_cta_ready") {
    return bs?.navigation.comparison_behavior ? "Validation-focused" : "Escalation earned";
  }
  return "Cautious progression";
}

function ladderIndex(profile: SessionProfile, primary: ExperienceDecision | null): number {
  const bs = profile.behavior_snapshot;
  const phase = bs?.commercial_journey_phase ?? profile.commercial_journey_phase ?? "research";
  const mem = profile.experience_progression;
  let idx = 0;
  switch (phase) {
    case "discovery":
    case "research":
      idx = 0;
      break;
    case "evaluation":
      idx = 1;
      break;
    case "comparison":
      idx = 2;
      break;
    case "validation":
      idx = 3;
      break;
    case "conversion_ready":
      idx = 4;
      break;
    default:
      idx = 1;
  }
  if (mem?.escalation_stage && membump(mem.escalation_stage, primary)) {
    idx = Math.max(idx, 3);
  }
  if (primary && primary.confidence >= 0.72 && idx < 4) idx = Math.max(idx, 3);
  return Math.min(Math.max(idx, 0), LADDER.length - 1);
}

function membump(stage: number, primary: ExperienceDecision | null): boolean {
  return stage >= 2 || (!!primary && stage >= 1);
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

  return tidySentence(core);
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

  if (primary?.reason?.length) {
    for (const r of primary.reason) {
      const b = sanitizeBullet(r);
      if (b) out.push(b);
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
    const sum = envelope?.suppression_summary?.trim();
    if (sum && !hasLeakage(sum)) {
      lines.push(`Stronger surface withheld: ${sum}`);
    } else {
      lines.push(
        "Stronger surface withheld: signals are still thin, mixed, or below the confidence needed for a hard ask.",
      );
    }
    return lines;
  }

  if (primary.action === "suppress" && primary.suppression_reason?.trim()) {
    const sr = primary.suppression_reason.trim();
    if (!hasLeakage(sr)) {
      lines.push(`${humanSurface(primary.surface_id)} suppressed: ${sr}`);
    }
  }

  const notes = envelope?.progression_notes?.filter(Boolean) ?? [];
  for (const n of notes) {
    if (/hold|cool|pacing|restraint|back|withheld/i.test(n) && !hasLeakage(n)) {
      lines.push(tidySentence(n));
    }
  }

  const posture = profile.behavior_snapshot?.activation_readiness.interruption_posture;
  if (lines.length === 0 && posture === "avoid_interrupt") {
    lines.push("Heavier interruptions avoided: current posture favors a lighter touch.");
  }

  if (lines.length === 0 && primary.friction === "high") {
    lines.push("Higher-friction treatment held back until pacing and confidence support it.");
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
  const phrase = t.reasons
    .map((c) => BUYER_REASON_COPY[c] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  if (!phrase.trim()) return null;
  return tidySentence(`Shift detected: ${phrase}`);
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

  const commercialRead = buildCommercialRead(profile, primary, envelope);

  const recommended = primary
    ? {
        show: primary.headline?.trim() || primary.offer_type.replace(/_/g, " "),
        surface: humanSurface(primary.surface_id),
        timing: humanTiming(primary.timing),
        escalationPosture: escalationPostureLabel(profile, primary, envelope),
        confidenceChip: confidenceChip(primary.confidence),
      }
    : {
        show: "Hold back until the visit clarifies",
        surface: "None selected yet",
        timing: "Waiting for clearer commercial signals",
        escalationPosture: "Suppression preferred",
        confidenceChip: null,
      };

  const whyBullets = buildWhyBullets(profile, primary);
  const withheld = buildWithheld(profile, primary, envelope);
  const progression = {
    steps: LADDER,
    currentIndex: ladderIndex(profile, primary),
  };
  const whatChanged = buildWhatChanged(replay);
  const families = buildFamilies(profile);

  return {
    commercialRead,
    recommended,
    whyBullets,
    withheld,
    progression,
    whatChanged,
    families,
  };
}
