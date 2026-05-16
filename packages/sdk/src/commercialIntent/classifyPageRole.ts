import type { SessionProfile } from "@si/shared";
import type { PageRole, PageRoleInterpretation } from "@si/shared";
import { COMMERCIAL_PAGE_ROLE_TAXONOMY } from "@si/shared";
import { normalizeActionText } from "./normalizeActionText";

export function classifyPageRole(profile: SessionProfile, pathname?: string): PageRoleInterpretation {
  const path = normalizeActionText((pathname ?? profile.signals.path_sequence.at(-1) ?? "/").replace(/\//g, " "));
  const title = normalizeActionText(
    profile.page_semantics?.h1_primary ?? profile.page_semantics?.og_title ?? "",
  );
  const blob = `${path} ${title}`;
  const evidence: string[] = [];
  const blocker_categories: string[] = [];

  let best: { role: PageRole; score: number } = { role: "exploration", score: 0 };

  for (const entry of COMMERCIAL_PAGE_ROLE_TAXONOMY) {
    let score = 0;
    for (const hint of entry.path_hints) {
      if (path.includes(normalizeActionText(hint))) {
        score += 2;
        evidence.push(`path:${hint}`);
      }
    }
    for (const hint of entry.title_hints) {
      if (title.includes(normalizeActionText(hint))) {
        score += 1;
        evidence.push(`title:${hint}`);
      }
    }
    if (score > best.score) {
      best = { role: entry.page_role as PageRole, score };
    }
  }

  if (profile.site_environment?.page.generic_kind === "pricing_page") {
    best = { role: "comparison", score: Math.max(best.score, 3) };
    evidence.push("generic_kind:pricing_page");
  }
  if (profile.site_environment?.page.generic_kind === "checkout_page") {
    best = { role: "conversion", score: Math.max(best.score, 4) };
    evidence.push("generic_kind:checkout_page");
  }

  if (["trust_validation", "objection_resolution"].includes(best.role)) {
    if (/security|privacy|compliance|review|return|shipping|warranty|faq/.test(blob)) {
      blocker_categories.push("trust_security_concern");
    }
    if (/return|shipping|refund|warranty/.test(blob)) blocker_categories.push("shipping_returns_uncertainty");
    if (/finance|payment|apr|calculator/.test(blob)) blocker_categories.push("financing_or_payment_uncertainty");
    if (/pricing|plans|fees|rates/.test(blob)) blocker_categories.push("pricing_uncertainty");
  }

  const confidence = Math.min(0.95, 0.45 + best.score * 0.12);

  return {
    page_role: best.role,
    confidence,
    evidence: evidence.slice(0, 6),
    blocker_categories: [...new Set(blocker_categories)],
  };
}
