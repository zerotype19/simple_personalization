import type { SessionProfile } from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";

/**
 * Non-destructive “consultant in the tag” plan for hosts where we do not apply DOM treatments (non–auto-retail).
 */
export function buildSafePersonalizationPlan(p: SessionProfile): string[] {
  if (isAutoSiteVertical(p.site_context.vertical)) return [];

  const lines: string[] = [];
  const scroll = p.signals.max_scroll_depth;
  if (scroll < 50) {
    lines.push(
      "Add an implementation guide or planning checklist CTA after ~50% scroll so engaged readers see a useful next step.",
    );
  } else {
    lines.push(
      "Place a secondary guide or resource CTA where scroll depth already shows readers are invested.",
    );
  }

  const pk = p.site_environment.page.generic_kind;
  if (pk === "article_page" || pk === "homepage") {
    lines.push("Promote one related framework or playbook article inline instead of repeating only the hero sell.");
  }

  if (p.signals.return_visit) {
    lines.push("For return visitors, prefer a softer demo or diagnostic CTA before the hardest conversion ask.");
  }

  const po = p.site_environment.conversion.primary_objective;
  if (!/pricing|purchase|checkout|cart/i.test(po)) {
    lines.push("Suppress aggressive pricing or package CTAs until product or pricing-intent signals strengthen.");
  }

  if (p.site_environment.ladder.level <= 1) {
    lines.push("Stay in observe mode on this host: refine signals before any DOM personalization.");
  }

  const nba = p.next_best_action;
  if (nba?.next_best_action) {
    lines.push(`Align messaging with the current session NBA: ${nba.next_best_action}`);
  }

  return lines.slice(0, 6);
}
