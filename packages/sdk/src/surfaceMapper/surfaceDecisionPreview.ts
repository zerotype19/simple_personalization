import type { ExperienceDecision } from "@si/shared";
import { buyerSafeLineOrNull } from "../decisioning/buyerCopySafety";

export interface SurfaceDecisionPreview {
  headline: string;
  timing: string;
  actionLine: string;
  offerLine: string | null;
  suppressionLine: string | null;
}

function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
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
      return "Near exit intent, when appropriate";
    case "idle":
      return "After a short quiet moment";
    default:
      return tidy(String(timing).replace(/_/g, " "));
  }
}

function humanAction(decision: ExperienceDecision): string {
  if (decision.action === "none") {
    return "No active recommendation on this surface for this moment.";
  }
  if (decision.action === "suppress") {
    return "Held back on purpose for this moment.";
  }
  const offer = tidy(decision.offer_type.replace(/_/g, " "));
  return `${tidy(decision.action.replace(/_/g, " "))} · ${offer}`;
}

/** Buyer-safe preview lines (no numeric confidence or runtime jargon). */
export function buildSurfaceDecisionPreview(decision: ExperienceDecision): SurfaceDecisionPreview {
  const timing =
    buyerSafeLineOrNull(humanTiming(decision.timing)) ?? "Timed to match how this surface should appear";
  if (decision.action === "none") {
    return {
      headline: "No strong decision yet",
      timing,
      actionLine: "None — no active recommendation on this surface for this moment.",
      offerLine: null,
      suppressionLine: null,
    };
  }
  if (decision.action === "suppress") {
    const sr = decision.suppression_reason?.trim();
    const suppressionLine =
      buyerSafeLineOrNull(sr ? tidy(sr) : "") ?? "This surface is intentionally held back.";
    return {
      headline: "Suppressed",
      timing,
      actionLine: "Held back on purpose for this moment.",
      offerLine: null,
      suppressionLine,
    };
  }
  const hlRaw = decision.headline?.trim() || decision.offer_type.replace(/_/g, " ");
  const hl = buyerSafeLineOrNull(hlRaw) ?? tidy(hlRaw);
  const body = decision.body?.trim();
  const offerLine = body ? buyerSafeLineOrNull(tidy(body.slice(0, 160))) : null;
  const actionLine = buyerSafeLineOrNull(humanAction(decision)) ?? humanAction(decision);
  return {
    headline: hl,
    timing,
    actionLine,
    offerLine,
    suppressionLine: null,
  };
}
