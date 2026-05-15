/**
 * Extra substring checks for regulated-vertical fixtures (additive to per-fixture `forbidden_terms`).
 * Keeps anonymous-session copy conservative without changing runtime suppression logic.
 */
const HEALTHCARE_SAFETY =
  /(you may be at risk|you may have\b|symptoms mean|at risk of cancer|\bhigh\s+risk\b|\bdiagnosis\b|\bdiagnose\b|diagnosed with|\bprognosis\b|schedule now|don'?t wait|limited time|\burgent\b|\bfear\b|life-?threatening|fatal if|guaranteed coverage|\bact now\b)/i;

const FINANCE_SAFETY =
  /(guaranteed approval|pre-?approved|preapproved|\byou qualify\b|improve your credit|\bbad credit\b|debt trouble|financial distress|distressed borrower|creditworthiness|everyone qualifies|no credit check|act now|\burgent\b|limited time|don'?t miss out|instant approval|apply now)/i;

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
