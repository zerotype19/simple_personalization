/** Deterministic label normalization for phrase matching (no NLP). */
export function normalizeActionText(raw: string): string {
  let t = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[→«»""'']/g, " ")
    .replace(/[^\p{L}\p{N}\s$%./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > 120) t = t.slice(0, 120);
  return t;
}

export function tokenizeActionText(normalized: string): string[] {
  return normalized.split(/\s+/).filter(Boolean);
}
