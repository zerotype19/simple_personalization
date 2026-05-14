/**
 * Buckets marketing-related link/button text for scans and semantics.
 * Order: support → hard conversion → soft conversion → navigation.
 */

export type CtaBucket = "hard" | "soft" | "navigation" | "support";

const SUPPORT =
  /\b(help\s*center|customer\s*support|support|my\s*account|account\s*settings|sign\s*in|log\s*in|login|logout)\b/i;

const HARD =
  /\b(buy\s+now|add\s+to\s+cart|add\s+to\s+bag|checkout|complete\s+(purchase|order)|purchase\s+now|pay\s+now|book\s+(a\s+)?demo|request\s+(a\s+)?quote|contact\s+sales|talk\s+to\s+sales|get\s+pricing|schedule\s+(a\s+)?(demo|call)|start\s+(your\s+)?(free\s+)?trial|sign\s+up\s+now|subscribe\s+now|place\s+order)\b/i;

const SOFT =
  /\b(learn\s+more|download(\s+(the|our))?\s+(guide|report|pdf|whitepaper|ebook)?|subscribe|newsletter|read\s+more|get\s+started|watch(\s+the)?\s+(video|webinar)?|listen|join\s+us|try\s+it\s+free)\b/i;

/** Nav-only labels (no conversion language mixed in). */
const NAV_LABEL =
  /^(products?|services|solutions|pricing|about(\s+us)?|blog|resources|insights|customers?|home|careers)$/i;

export function classifyCtaText(raw: string): CtaBucket | null {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > 80) return null;
  if (SUPPORT.test(t)) return "support";
  if (HARD.test(t)) return "hard";
  if (SOFT.test(t)) return "soft";
  if (t.length <= 36 && NAV_LABEL.test(t)) return "navigation";
  return null;
}

export function bucketCtaLabels(texts: Iterable<string>): Record<CtaBucket, string[]> {
  const out: Record<CtaBucket, string[]> = {
    hard: [],
    soft: [],
    navigation: [],
    support: [],
  };
  const seen = new Set<string>();
  for (const raw of texts) {
    const t = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!t || seen.has(t.toLowerCase())) continue;
    const b = classifyCtaText(t);
    if (!b) continue;
    seen.add(t.toLowerCase());
    out[b].push(t);
  }
  return out;
}
