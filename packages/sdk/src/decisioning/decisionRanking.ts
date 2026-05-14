import type { ExperienceDecision } from "@si/shared";

export function rankDecisions(candidates: ExperienceDecision[]): ExperienceDecision[] {
  return [...candidates].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.priority - a.priority;
  });
}
