/**
 * Extra substring checks for regulated-vertical fixtures (additive to per-fixture `forbidden_terms`).
 * Keeps anonymous-session copy conservative without changing runtime suppression logic.
 */
const HEALTHCARE_SAFETY =
  /(you may be at risk|at risk of cancer|diagnosis|diagnosed with|prognosis|schedule now|don'?t wait|limited time|\burgent\b|\bfear\b|life-?threatening|fatal if)/i;

const FINANCE_SAFETY =
  /(guaranteed approval|pre-?approved|preapproved|creditworthiness|everyone qualifies|no credit check|financial distress|distressed borrower|act now|\burgent\b.*\bapply|instant approval)/i;

export function assertRegulatedVerticalSafetyBlob(
  vertical: "healthcare" | "financial_services",
  blob: string,
  errors: string[],
): void {
  if (!blob.trim()) return;
  const rx = vertical === "healthcare" ? HEALTHCARE_SAFETY : FINANCE_SAFETY;
  if (rx.test(blob)) {
    errors.push(`Regulated ${vertical} safety: disallowed phrase matched in primary copy or reasons.`);
  }
}
