import type { SiteScanSummary } from "@si/shared";
import { classifyCtaText } from "./ctaClassifier";

function countConversionHits(): { header_hits: number; main_hits: number } {
  if (typeof document === "undefined") return { header_hits: 0, main_hits: 0 };
  let header_hits = 0;
  let main_hits = 0;
  document.querySelectorAll("header a, header button").forEach((el, i) => {
    if (i > 40) return;
    const t = (el.textContent ?? "").trim();
    if (t.length < 2 || t.length > 80) return;
    const b = classifyCtaText(t);
    if (b === "hard" || b === "soft") header_hits++;
  });
  document.querySelectorAll("main a, main button").forEach((el, i) => {
    if (i > 80) return;
    const t = (el.textContent ?? "").trim();
    if (t.length < 2 || t.length > 80) return;
    const b = classifyCtaText(t);
    if (b === "hard" || b === "soft") main_hits++;
  });
  return { header_hits, main_hits };
}

export function analyzeCtaProminence(scan: SiteScanSummary): { header_hits: number; main_hits: number } {
  void scan;
  return countConversionHits();
}

export function primaryCtaNarrative(scan: SiteScanSummary, header_hits: number, main_hits: number): string {
  const hardN = scan.cta_text_hard?.length ?? 0;
  const softN = scan.cta_text_soft?.length ?? 0;
  const conv = hardN + softN;
  if (conv === 0 && header_hits + main_hits === 0) {
    return "No conversion-style CTA text detected yet in header or main (nav-only or exploratory labels).";
  }
  if (hardN >= 1 && softN >= 1) {
    return `Mix of hard (${hardN}) and soft (${softN}) conversion CTAs sampled — prioritize hard paths when engagement is high.`;
  }
  if (hardN >= 1) return `${hardN} high-intent CTA label(s) captured (checkout, demo, quote, …).`;
  if (header_hits + main_hits >= 4) return "Several conversion-oriented CTAs visible across header and main.";
  if (header_hits >= 1 && main_hits >= 1) return "Conversion CTAs present in both header and main content.";
  if (softN >= 1) return `${softN} softer CTA label(s) (learn more, guides, subscribe) — pair with a clearer hard step when intent is strong.`;
  if (conv >= 1) return `${conv} primary CTA sample(s) captured from header/main.`;
  return "Light conversion CTA presence in the sampled layout regions.";
}
