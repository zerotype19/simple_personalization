import type { GenericPageKind, NavigationPatternRead, SessionSignals } from "@si/shared";

export interface LandingPatternRead {
  summary: string | null;
  /** True when first-touch + early journey resembles classic organic research (deep land, scroll, content depth). */
  organic_research_shape: boolean;
  evidence: string[];
}

function isDeepCommercialEntry(kind: GenericPageKind): boolean {
  return (
    kind === "article_page" ||
    kind === "product_detail_page" ||
    kind === "pricing_page" ||
    kind === "search_results_page" ||
    kind === "category_page" ||
    kind === "lead_form_page"
  );
}

/**
 * First-landing + early-session shape for probabilistic acquisition (no referrer required).
 */
export function analyzeLandingAcquisitionPattern(input: {
  entryKind: GenericPageKind | null;
  signals: SessionSignals;
  navigation: NavigationPatternRead;
}): LandingPatternRead {
  const { entryKind, signals, navigation } = input;
  const evidence: string[] = [];
  let organic_research_shape = false;

  if (entryKind && entryKind !== "homepage" && isDeepCommercialEntry(entryKind)) {
    evidence.push("Non-home first landing — common for search / referral deep links");
  }
  if (entryKind === "article_page") {
    evidence.push("Editorial or long-form entry — typical organic information intent");
    organic_research_shape = true;
  }
  if (entryKind === "product_detail_page") {
    evidence.push("Product detail entry — common for high-intent product search");
    organic_research_shape = true;
  }
  if (entryKind === "pricing_page" || entryKind === "lead_form_page") {
    evidence.push("Commercial surface entry — strong evaluation intent");
    organic_research_shape = true;
  }

  if (signals.max_scroll_depth >= 55) {
    evidence.push("Meaningful first-page scroll — consumption vs bounce");
    organic_research_shape = true;
  }
  if (
    navigation.journey_pattern === "content_depth_led" ||
    navigation.journey_pattern === "research_to_evaluation" ||
    navigation.journey_pattern === "comparison_led_browse"
  ) {
    evidence.push(`Early journey pattern: ${navigation.journey_pattern.replace(/_/g, " ")}`);
    organic_research_shape = true;
  }
  if (navigation.comparison_behavior) {
    evidence.push("Comparison behavior across pages");
    organic_research_shape = true;
  }
  if (signals.pages_viewed >= 2 && signals.session_duration_ms > 12_000) {
    evidence.push("Multi-page session with time on site — research trajectory");
    organic_research_shape = true;
  }

  const summary =
    evidence.length === 0
      ? null
      : organic_research_shape
        ? "Research-oriented landing pattern (deep or commercial entry with engagement)."
        : "Mixed landing pattern — limited organic-style signals so far.";

  return { summary, organic_research_shape, evidence: evidence.slice(0, 6) };
}
