import type { ExperienceDecision, ExperienceDecisionEnvelope, SessionProfile } from "@si/shared";

function phaseLabel(phase: string | undefined): string {
  if (!phase) return "an unclear evaluation stage";
  const map: Record<string, string> = {
    research: "early research",
    comparison: "active comparison",
    evaluation: "structured evaluation",
    validation: "late validation",
  };
  return map[phase] ?? phase.replace(/_/g, " ");
}

/** Plain-language rationale for the inspector (sales-facing, not slot wiring). */
export function buildExperienceOperatorNarrative(
  profile: SessionProfile,
  primary: ExperienceDecision | null,
  suppressionSummary?: string,
): string {
  const v = profile.site_context.vertical;
  const bs = profile.behavior_snapshot;
  const phase = profile.commercial_journey_phase ?? bs?.commercial_journey_phase;
  const readiness = profile.personalization_signal.activation_readiness_score ?? profile.engagement_score;
  const posture = bs?.activation_readiness.interruption_posture ?? "soft_cta_ready";
  const comparison = bs?.navigation.comparison_behavior;
  const velocity = bs?.navigation.journey_velocity;
  const eg = bs?.engagement_quality.label;

  if (!primary) {
    const tail = suppressionSummary?.trim()
      ? ` ${suppressionSummary.trim()}`
      : " Signals are still thin, contradictory, or below the confidence floor for a strong recommendation.";
    if (v === "b2b_saas" || v === "lead_generation" || v === "content_led_business") {
      return `This session reads as ${phaseLabel(phase)} on a B2B motion with ${Math.round(profile.engagement_score)} engagement and roughly ${Math.round(readiness)} activation readiness (${posture.replace(/_/g, " ")}). We are holding back a primary experience decision on purpose—restraint beats a generic CTA.${tail}`;
    }
    return `No primary experience decision for this snapshot.${tail}`;
  }

  const recipe = primary.source_recipe_id ? `Recipe ${primary.source_recipe_id}` : "Matched experience recipe";
  const timingWhy =
    primary.timing === "next_navigation"
      ? "Timing waits for the next navigation so the visitor finishes the current thought before we add weight."
      : primary.timing === "after_scroll"
        ? "Timing follows scroll so inline value lands after the visitor has shown page intent."
        : `Timing is ${primary.timing.replace(/_/g, " ")} so the interruption matches how this surface is meant to behave.`;

  if (v === "b2b_saas" || v === "lead_generation" || v === "content_led_business") {
    const comp = comparison ? " They are showing comparison-style navigation." : "";
    const vel = velocity ? ` Journey velocity reads as ${velocity.replace(/_/g, " ")}.` : "";
    const read = eg ? ` Engagement quality: ${eg.replace(/_/g, " ")}.` : "";
    return `Visitor appears to be in ${phaseLabel(phase)} with ${Math.round(profile.engagement_score)} engagement and about ${Math.round(readiness)} activation readiness.${comp}${vel}${read} ${recipe} favors ${primary.offer_type.replace(/_/g, " ")} on ${primary.surface_id.replace(/_/g, " ")}—practical guidance over a premature hard sales step when signals support it. ${timingWhy}`;
  }

  return `${recipe} selected ${primary.surface_id} (${primary.offer_type}) at ${Math.round(primary.confidence * 100)}% confidence. ${timingWhy}`;
}

/**
 * Operator-facing explanation of browser-local progression memory (pacing, families, escalation warming).
 */
export function buildSessionProgressionNarrative(
  profile: SessionProfile,
  envelope?: ExperienceDecisionEnvelope | null,
): string {
  const mem = profile.experience_progression;
  const notes = envelope?.progression_notes?.filter(Boolean) ?? [];
  if (!mem && notes.length === 0) {
    return "Session progression memory is still neutral: pacing and family continuity tighten once primaries begin landing across navigations.";
  }
  const stage = mem?.escalation_stage ?? 0;
  const navTick = mem?.navigation_tick ?? 0;
  const lastFamRaw =
    mem?.recent_decision_families?.length && mem.recent_decision_families.length > 0
      ? mem.recent_decision_families[mem.recent_decision_families.length - 1]
      : undefined;
  const lastFam = lastFamRaw ? lastFamRaw.replace(/_/g, " ") : null;
  const lastSurfaces = mem?.recent_surfaces_shown?.slice(-4) ?? [];
  const surfaceHint =
    lastSurfaces.length > 0
      ? `Recent primary surfaces (oldest → newest): ${lastSurfaces.join(", ")}.`
      : "No recorded primary surfaces yet this session.";
  const famHint = lastFam
    ? `The last emitted decision family reads as "${lastFam}", so continuity bias treats this as an ongoing thread rather than a cold start.`
    : "Decision family history is still thin, so the runtime is permissive about the next family hop.";
  const noteHint =
    notes.length > 0
      ? `This evaluation tick: ${notes.slice(-3).join(" ")}`
      : "No progression holds fired on this tick — candidates cleared gates or the primary slot stayed empty.";
  return `${famHint} Escalation warming is at stage ${stage} (route ticks counted: ${navTick}). ${surfaceHint} ${noteHint}`;
}
