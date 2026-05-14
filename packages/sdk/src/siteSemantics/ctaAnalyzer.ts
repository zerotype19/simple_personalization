import type { SiteScanSummary } from "@si/shared";
import { normalizeReadableText } from "./normalizeText";

export function analyzeCtaProminence(scan: SiteScanSummary): { header_hits: number; main_hits: number } {
  if (typeof document === "undefined") return { header_hits: 0, main_hits: 0 };
  const re =
    /\b(start|try|demo|pricing|sign\s*up|subscribe|book|contact|get\s+started|learn\s+more|join|free\s+trial|download|request)\b/i;
  let header_hits = 0;
  let main_hits = 0;
  document.querySelectorAll("header a, header button").forEach((el, i) => {
    if (i > 40) return;
    const t = (el.textContent ?? "").trim();
    if (t.length > 1 && t.length < 80 && re.test(t)) header_hits++;
  });
  document.querySelectorAll("main a, main button").forEach((el, i) => {
    if (i > 80) return;
    const t = (el.textContent ?? "").trim();
    if (t.length > 1 && t.length < 80 && re.test(t)) main_hits++;
  });
  void scan;
  return { header_hits, main_hits };
}

export function primaryCtaNarrative(scan: SiteScanSummary, header_hits: number, main_hits: number): string {
  const n = scan.primary_ctas.length;
  if (n === 0 && header_hits + main_hits === 0) return "No dominant conversion CTA detected yet in header or main.";
  if (header_hits + main_hits >= 4) return "Several conversion-oriented CTAs visible across header and main.";
  if (header_hits >= 1 && main_hits >= 1) return "Conversion CTAs present in both header and main content.";
  if (n >= 1) return `${n} primary CTA sample(s) captured from header/main.`;
  return "Light CTA presence in the sampled layout regions.";
}
