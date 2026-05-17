import type { SessionProfile } from "@si/shared";
import type { JourneyStep, LiveReadingCopy } from "./journeyConfig";

/** Blend static step copy with live session memory when available. */
export function buildLiveReading(step: JourneyStep | null, profile: SessionProfile | null): LiveReadingCopy {
  if (!step) {
    return {
      commercialIntent: "Start the journey to see how Optiview interprets each step.",
      momentum: "Interest depth and reassurance needs will update as you click.",
      judgment: "Escalation stays earned — not automatic.",
    };
  }

  const base = step.live;
  const mem = profile?.commercial_intent;
  if (!mem) return base;

  const mom = mem.momentum.direction;
  const blocker = mem.blockers[0]?.id ?? "";

  let commercialIntent = base.commercialIntent;
  if (mem.strongest_action_family === "view_financing" || mem.qualification_interactions > 0) {
    commercialIntent = "Comparison behavior with growing financing interest.";
  } else if (mem.strongest_action_family === "schedule_test_drive" || mem.human_escalation_interactions > 0) {
    commercialIntent = "Human-contact intent is strengthening alongside earlier evaluation.";
  } else if ((mem.action_counts.compare ?? 0) > 0) {
    commercialIntent = "Comparison behavior — narrowing options before a stronger ask.";
  }

  let momentum = base.momentum;
  if (mom === "validating") {
    momentum = "The visitor appears to be moving deeper into validation and planning.";
  } else if (mom === "increasing") {
    momentum = "Interest is deepening across the visit.";
  } else if (mom === "hesitating") {
    momentum = "The visit shows hesitation — reassurance may matter more than a harder ask.";
  }

  let judgment = base.judgment;
  if (blocker.includes("financing") || blocker.includes("payment")) {
    judgment =
      "Optiview is favoring reassurance and payment guidance before a stronger escalation.";
  } else if (mem.human_escalation_interactions > 0 && mom === "increasing") {
    judgment = "Escalation is more earned — stronger human-contact guidance can fit.";
  }

  return { commercialIntent, momentum, judgment };
}
