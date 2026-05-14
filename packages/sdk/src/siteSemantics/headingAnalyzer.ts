import { normalizeReadableText } from "./normalizeText";

export function analyzeHeadings(): {
  h1_primary: string | null;
  heading_counts: { h2: number; h3: number };
} {
  if (typeof document === "undefined") {
    return { h1_primary: null, heading_counts: { h2: 0, h3: 0 } };
  }
  const h1 = normalizeReadableText(document.querySelector("h1")?.textContent ?? "");
  return {
    h1_primary: h1 || null,
    heading_counts: {
      h2: Math.min(document.querySelectorAll("h2").length, 80),
      h3: Math.min(document.querySelectorAll("h3").length, 80),
    },
  };
}
