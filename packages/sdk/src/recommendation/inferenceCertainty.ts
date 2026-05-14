import type { SessionProfile } from "@si/shared";
import { publicSiteTypeLabel } from "../siteIntelligence/publicLabels";

export interface InferenceCertaintyBands {
  high: string[];
  medium: string[];
  low: string[];
}

/**
 * Human-readable certainty bands for the inspector (trust UX).
 */
export function buildInferenceCertaintyBands(p: SessionProfile): InferenceCertaintyBands {
  const high: string[] = [];
  const medium: string[] = [];
  const low: string[] = [];

  const env = p.site_environment;
  const { page, site, conversion } = env;

  if (page.confidence >= 0.72) high.push(`Page classified as ${page.generic_kind.replace(/_/g, " ")}`);
  else if (page.confidence >= 0.5) medium.push(`Page kind guess (${Math.round(page.confidence * 100)}% confidence)`);
  else low.push("Page archetype is still ambiguous");

  if (p.engagement_score >= 65) high.push("Visitor is deeply engaged this session");
  else if (p.engagement_score >= 45) medium.push("Moderate engagement — keep collecting signals");

  if (site.confidence >= 0.65) high.push(`Site type read as ${publicSiteTypeLabel(site.site_type)}`);
  else medium.push(`Site objective appears to be ${conversion.primary_objective.replace(/_/g, " ")}`);

  if (conversion.confidence >= 0.62) medium.push("Conversion objective inference is reasonably grounded");
  else low.push("Conversion objective is tentative — few CTA or funnel cues");

  const hardCtas = p.site_context.scan.cta_text_hard?.length ?? 0;
  const softCtas = p.site_context.scan.cta_text_soft?.length ?? 0;
  const convSamples = hardCtas + softCtas > 0 ? hardCtas + softCtas : p.site_context.scan.primary_ctas.length;

  if (hardCtas >= 2) high.push("High-intent conversion CTAs detected (checkout, demo, quote, …)");
  else if (hardCtas === 1 || convSamples >= 2) medium.push("Conversion-oriented CTA text sampled in header/main");
  else if (convSamples === 1) medium.push("Limited CTA diversity on this page sample");
  else low.push("No hard conversion CTA engagement detected yet in the sampled chrome");

  if (env.ladder.level === 1) {
    low.push("Ladder level 1 — keep recommendations lightweight until site, page, and funnel reads strengthen.");
  } else if (env.ladder.level === 2) {
    medium.push("Ladder level 2 — stronger recommendations are reasonable; how you execute still depends on host policy.");
  } else if (env.ladder.level >= 3) {
    medium.push(
      "Ladder level 3+ — model confidence supports safe personalization recommendations; DOM execution is still your opt-in.",
    );
  }

  return {
    high: [...new Set(high)].slice(0, 6),
    medium: [...new Set(medium)].slice(0, 6),
    low: [...new Set(low)].slice(0, 6),
  };
}

export function describeConversionSurfaces(p: SessionProfile): string[] {
  const out: string[] = [];
  const ctas = [...(p.site_context.scan.cta_text_hard ?? []), ...(p.site_context.scan.cta_text_soft ?? [])]
    .concat(p.site_context.scan.primary_ctas)
    .join(" ")
    .toLowerCase();
  const el = p.site_environment.conversion.detected_elements;

  if (/newsletter|subscribe/i.test(ctas)) out.push("Newsletter / subscribe");
  if (/contact|talk|sales|demo|book/i.test(ctas)) out.push("Contact / demo / sales");
  if (/pricing|plan/i.test(ctas)) out.push("Pricing / plans");
  if (/cart|checkout|bag/i.test(ctas)) out.push("Cart / checkout");
  if (/download|guide|whitepaper/i.test(ctas)) out.push("Download / guide");
  for (const x of el) {
    if (x.includes("commerce")) out.push("Commerce intent cues");
    if (x.includes("lead")) out.push("Lead capture cues");
    if (x.includes("article")) out.push("Content surface");
  }
  return [...new Set(out)].slice(0, 8);
}
