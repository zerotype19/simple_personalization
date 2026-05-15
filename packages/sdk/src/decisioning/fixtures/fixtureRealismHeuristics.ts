import type { ExperienceDecision } from "@si/shared";
import type { FixtureSessionInput } from "./types";

/** Non-blocking diagnostics for fixture tuning (printed by CLI when present). */
export function collectFixtureRealismWarnings(
  session: FixtureSessionInput,
  primary: ExperienceDecision | null,
): string[] {
  const w: string[] = [];
  if (!primary) return w;
  const blob = [primary.headline, primary.body, primary.cta_label].join(" ").toLowerCase();
  if (blob.replace(/\s+/g, " ").trim().length < 50) {
    w.push("primary copy is very short—consider richer operator-grade body/CTA.");
  }
  if (session.vertical === "b2b_saas" && primary.body.length < 55) {
    w.push("b2b body is very short for an operator briefing (heuristic).");
  }
  if ((primary.reason?.length ?? 0) < 2) w.push("few reason lines—downstream explainability may be thin.");
  return w;
}
