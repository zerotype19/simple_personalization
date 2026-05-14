/** Collapse whitespace so stitched headings/titles read naturally in the panel. */
export function normalizeReadableText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\s+/g, " ")
    .replace(/systemfor\b/gi, "system for")
    .trim();
}
