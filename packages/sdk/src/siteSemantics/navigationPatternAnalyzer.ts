import type { GenericPageKind, NavigationPatternRead, PageJourneyEntry, SessionSignals } from "@si/shared";

function kindLabel(k: GenericPageKind): string {
  return k.replace(/_/g, " ");
}

function compactPathForSummary(path: string): string {
  const p = (path.split("?")[0] || "/").trim() || "/";
  if (p === "/") return "/";
  return p.length > 44 ? `${p.slice(0, 41)}…` : p;
}

/**
 * Path + page-role sequence → journey shape (anonymous, first-party only).
 */
export function analyzeNavigationPattern(
  steps: PageJourneyEntry[] | undefined,
  signals: SessionSignals,
): NavigationPatternRead {
  const seq = steps ?? [];
  const kinds = seq.map((s) => s.generic_kind);
  const paths = seq.map((s) => s.path);

  const path_summary =
    seq.length === 0
      ? "—"
      : (() => {
          const parts: string[] = [];
          let prev = "";
          for (const s of seq.slice(-14)) {
            const seg = `${compactPathForSummary(s.path)} (${kindLabel(s.generic_kind)})`;
            if (seg === prev) continue;
            prev = seg;
            parts.push(seg);
          }
          return parts.length === 0 ? "—" : parts.slice(-6).join(" → ");
        })();

  const comparison_behavior =
    kinds.some((k) => k === "product_detail_page" || k === "search_results_page") &&
    (paths.join(" ").includes("compare") ||
      kinds.filter((k) => k === "product_detail_page").length >= 2 ||
      signals.compare_interactions >= 1);

  let high_intent_transition = false;
  for (let i = 1; i < kinds.length; i++) {
    const prev = kinds[i - 1]!;
    const cur = kinds[i]!;
    if (
      (prev === "article_page" || prev === "homepage" || prev === "category_page") &&
      (cur === "pricing_page" || cur === "lead_form_page" || cur === "checkout_page" || cur === "cart_page")
    ) {
      high_intent_transition = true;
      break;
    }
  }

  let journey_velocity: NavigationPatternRead["journey_velocity"] = "deliberate";
  if (seq.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < seq.length; i++) {
      deltas.push(seq[i]!.t - seq[i - 1]!.t);
    }
    const med = deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)] ?? 0;
    if (med < 4500 && signals.pages_viewed >= 3) journey_velocity = "rapid";
    else if (med > 45000) journey_velocity = "slow";
  }

  let journey_pattern = "explore";
  if (comparison_behavior && high_intent_transition) journey_pattern = "research_to_evaluation";
  else if (comparison_behavior) journey_pattern = "comparison_led_browse";
  else if (kinds.includes("pricing_page") || kinds.includes("lead_form_page")) journey_pattern = "evaluation_or_conversion_surface";
  else if (kinds.filter((k) => k === "article_page").length >= 2) journey_pattern = "content_depth_led";

  return {
    journey_pattern,
    journey_velocity,
    comparison_behavior,
    high_intent_transition,
    path_summary,
  };
}
