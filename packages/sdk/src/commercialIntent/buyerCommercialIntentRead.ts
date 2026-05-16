import type { SessionProfile } from "@si/shared";
import { isBuyerUnsafeString } from "../decisioning/buyerCopySafety";

/** Buyer-safe commercial intent summary for inspector (no taxonomy ids). */
export function buildBuyerCommercialIntentRead(profile: SessionProfile): string[] {
  const mem = profile.commercial_intent;
  if (!mem) return [];

  const lines: string[] = [];
  const mom = mem.momentum.direction;

  if (mom === "increasing") {
    lines.push("Recent behavior suggests commercial interest is deepening across the visit.");
  } else if (mom === "validating") {
    lines.push("The visitor appears to be validating trust or details before committing to a stronger step.");
  } else if (mom === "hesitating") {
    lines.push("Signals suggest hesitation — reassurance may fit better than a harder ask right now.");
  } else if (mom === "regressing") {
    lines.push("The path recently moved back toward lighter research rather than escalation.");
  } else {
    lines.push("Commercial posture looks exploratory so far — the runtime is staying patient.");
  }

  if (mem.human_escalation_interactions > 0) {
    lines.push("Recent actions suggest interest in human contact or an in-person next step.");
  } else if (mem.qualification_interactions > 0) {
    lines.push("Recent actions point toward qualification — pricing, financing, or fit tools.");
  }

  const topBlocker = mem.blockers[0];
  if (topBlocker && topBlocker.confidence >= 0.55) {
    if (topBlocker.id.includes("pricing")) {
      lines.push("Pricing or plan clarity may still be the main open question.");
    } else if (topBlocker.id.includes("trust") || topBlocker.id.includes("security")) {
      lines.push("Trust or security validation still appears active in the journey.");
    } else if (topBlocker.id.includes("financing") || topBlocker.id.includes("payment")) {
      lines.push("Financing or payment fit may still need reassurance before escalation.");
    } else if (topBlocker.id.includes("implementation") || topBlocker.id.includes("integration")) {
      lines.push("Implementation or integration concerns may be slowing a stronger step.");
    }
  }

  return lines.filter((l) => !isBuyerUnsafeString(l)).slice(0, 4);
}
