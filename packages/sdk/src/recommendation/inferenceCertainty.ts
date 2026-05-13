import type { SessionProfile } from "@si/shared";

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

  if (site.confidence >= 0.65) high.push(`Site type read as ${site.site_type.replace(/_/g, " ")}`);
  else medium.push(`Site objective appears to be ${conversion.primary_objective.replace(/_/g, " ")}`);

  if (conversion.confidence >= 0.62) medium.push("Conversion objective inference is reasonably grounded");
  else low.push("Conversion objective is tentative — few CTA or funnel cues");

  if (p.site_context.scan.primary_ctas.length >= 2) high.push("Primary conversion surfaces detected from CTA text");
  else if (p.site_context.scan.primary_ctas.length === 1) medium.push("Limited CTA diversity on this page sample");
  else low.push("No clear primary CTA detected yet in the sampled chrome");

  if (env.ladder.level === 1) low.push("Personalization ladder is observe-only until confidence rises");

  return {
    high: [...new Set(high)].slice(0, 6),
    medium: [...new Set(medium)].slice(0, 6),
    low: [...new Set(low)].slice(0, 6),
  };
}

export function describeConversionSurfaces(p: SessionProfile): string[] {
  const out: string[] = [];
  const ctas = p.site_context.scan.primary_ctas.join(" ").toLowerCase();
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
