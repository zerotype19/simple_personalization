/**
 * Banned clichés that read as generic marketing automation (fixture-enforced on primary blob).
 * Substring checks are case-insensitive.
 */
const WEAK_PHRASES: string[] = [
  " unlock",
  "unlock ",
  "maximize ",
  " supercharge",
  "supercharge ",
  "frictionless",
  " seamless",
  "seamless ",
  "tailored journey",
  "tailored content",
  "boost engagement",
  "personalized experience",
  "optimize your workflow",
  "optimize your journey",
  "drive conversions",
  " elevate ",
  "elevate your",
  "discover your",
  " tailored experience",
  "unlock the",
  "unlock your",
];

export function assertNoWeakMarketingCopy(blob: string, errors: string[]): void {
  if (!blob.trim()) return;
  const lower = blob.toLowerCase();
  for (const p of WEAK_PHRASES) {
    if (lower.includes(p.trim().toLowerCase())) {
      errors.push(`Weak marketing copy guard: disallowed phrase "${p.trim()}" appeared in primary output.`);
    }
  }
}
