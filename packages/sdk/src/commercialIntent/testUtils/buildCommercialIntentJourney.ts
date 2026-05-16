import type {
  CommercialActionInterpretation,
  CommercialIntentMemory,
  SiteVertical,
  SessionProfile,
} from "@si/shared";
import { minimalProfile } from "../../test/fixtures";
import { applyCommercialIntentTick } from "../applyCommercialIntentTick";
import { buildBuyerCommercialIntentRead } from "../buyerCommercialIntentRead";
import { classifyCommercialAction } from "../classifyCommercialAction";
import { classifyPageRole } from "../classifyPageRole";
import { inferCommercialBlockers } from "../inferCommercialBlockers";
import { inferJourneyMomentum } from "../inferJourneyMomentum";
import { buyerSafeTimelineLabel } from "../timelineLabels";
import { updateCommercialIntentMemory } from "../updateCommercialIntentMemory";

export interface JourneyClickStep {
  /** Visible CTA label or phrase to classify. */
  text: string;
  href?: string;
  /** Appended to `signals.path_sequence` before this click. */
  path?: string;
  vertical?: SiteVertical;
  dataSiCta?: string | null;
  dataSiIntent?: string | null;
  /** When set, passed through to memory update (hero primary CTAs). */
  shouldCountAsHighIntent?: boolean;
}

export interface CommercialIntentJourneyResult {
  profile: SessionProfile;
  memory: CommercialIntentMemory;
  blockers: ReturnType<typeof inferCommercialBlockers>;
  momentum: ReturnType<typeof inferJourneyMomentum>;
  buyerRead: string[];
  lastAction: CommercialActionInterpretation;
  pageRole: ReturnType<typeof classifyPageRole>;
}

function profileForVertical(vertical: SiteVertical, overrides?: Partial<SessionProfile>): SessionProfile {
  return minimalProfile({
    site_context: { ...minimalProfile().site_context, vertical, vertical_confidence: 90 },
    ...overrides,
  });
}

function pushPath(profile: SessionProfile, path: string): void {
  const seq = profile.signals.path_sequence;
  if (seq[seq.length - 1] !== path) seq.push(path);
}

function interpretClick(
  profile: SessionProfile,
  step: JourneyClickStep,
  vertical: SiteVertical,
): CommercialActionInterpretation {
  const action = classifyCommercialAction({
    text: step.text,
    href: step.href,
    vertical: step.vertical ?? vertical,
  });
  let family = action.action_family;
  if (step.dataSiCta === "finance") family = "view_financing";
  if (step.dataSiCta === "compare") family = "compare";
  if (step.dataSiIntent) {
    const intentNorm = step.dataSiIntent.replace(/-/g, "_");
    if (intentNorm !== "primary" && intentNorm !== "secondary") {
      family = intentNorm as typeof family;
    }
  }
  const resolved =
    family === action.action_family
      ? action
      : { ...action, action_family: family, evidence: [...action.evidence, "journey_step_override"] };
  profile.commercial_intent = updateCommercialIntentMemory(profile, {
    action: resolved,
    element_role: "inline_content",
    is_primary_visual_cta: true,
    is_repeated_chrome_cta: false,
    should_count_as_cta_click: true,
    should_count_as_high_intent:
      step.shouldCountAsHighIntent ??
      (resolved.intent_strength === "high" || resolved.intent_strength === "very_high"),
    timeline_label: buyerSafeTimelineLabel(resolved),
  });
  return resolved;
}

/**
 * Replays a vertical journey without DOM: classification → memory → blockers → momentum → buyer read.
 */
export function buildCommercialIntentJourney(
  vertical: SiteVertical,
  steps: JourneyClickStep[],
  profileOverrides?: Partial<SessionProfile>,
): CommercialIntentJourneyResult {
  const profile = profileForVertical(vertical, profileOverrides);
  let lastAction = classifyCommercialAction({ text: "explore", vertical });

  for (const step of steps) {
    if (step.path) pushPath(profile, step.path);
    lastAction = interpretClick(profile, step, vertical);
  }

  applyCommercialIntentTick(profile);
  const memory = profile.commercial_intent!;
  const blockers = inferCommercialBlockers(profile, memory);
  const momentum = inferJourneyMomentum(profile, memory, lastAction);
  const pageRole = classifyPageRole(profile);
  const buyerRead = buildBuyerCommercialIntentRead(profile);

  return { profile, memory, blockers, momentum, buyerRead, lastAction, pageRole };
}
