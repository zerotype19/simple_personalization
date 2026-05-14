import type { ExperienceDecision } from "@si/shared";
import { buildExperienceDecisionEnvelope } from "../buildExperienceDecisionEnvelope";
import { buildFixtureProfile } from "./buildFixtureProfile";
import type {
  FixtureBadDecisionsFile,
  FixtureExpectedPrimary,
  FixtureExpectationSnapshot,
  FixtureRunResult,
  FixtureSessionInput,
} from "./types";

function expectationSnapshot(expected: FixtureExpectedPrimary): FixtureExpectationSnapshot {
  return {
    primaryMustBeNull: Boolean(expected.primary_must_be_null || expected.primary_decision === null),
    expectedSurfaceId: expected.expected_surface_id,
    expectedOfferType: expected.expected_offer_type,
    expectedMessageAngle: expected.expected_message_angle,
    expectedTiming: expected.expected_timing,
  };
}

function primaryBlob(d: ExperienceDecision | null): string {
  if (!d) return "";
  return [d.headline, d.body, d.cta_label, d.message_angle, d.offer_type, ...d.reason, ...d.evidence].join(" ");
}

function assertForbiddenTerms(blob: string, terms: string[] | undefined, errors: string[]): void {
  if (!terms?.length) return;
  const lower = blob.toLowerCase();
  for (const t of terms) {
    if (lower.includes(t.toLowerCase())) errors.push(`Forbidden term "${t}" appeared in primary output.`);
  }
}

function assertBadPatterns(blob: string, bad: FixtureBadDecisionsFile | undefined, errors: string[]): void {
  if (!bad?.length) return;
  const lower = blob.toLowerCase();
  for (const b of bad) {
    if (lower.includes(b.forbidden_substring.toLowerCase())) {
      errors.push(`Bad pattern "${b.forbidden_substring}" must not appear in primary copy or reasons.`);
    }
  }
}

export function runFixtureCase(
  verticalFolder: string,
  caseId: string,
  sessionInput: FixtureSessionInput,
  expected: FixtureExpectedPrimary,
  bad: FixtureBadDecisionsFile | undefined,
  now = Date.now(),
): FixtureRunResult {
  const errors: string[] = [];
  const profile = buildFixtureProfile(sessionInput);
  const { envelope, slotDecisions } = buildExperienceDecisionEnvelope(profile, { now });
  const primary = envelope.primary_decision;

  const expPartial = expected.primary_decision;
  if (
    primary &&
    expPartial != null &&
    typeof expPartial === "object" &&
    Object.keys(expPartial as object).length > 0
  ) {
    const partial = expPartial as Partial<ExperienceDecision>;
    (["action", "friction", "cta_label"] as const).forEach((k) => {
      const v = partial[k];
      if (v !== undefined && primary[k] !== v) {
        errors.push(`primary.${k} expected ${String(v)}, got ${String(primary[k])}.`);
      }
    });
  }

  if (expected.primary_must_be_null || expected.primary_decision === null) {
    if (primary != null) {
      errors.push(`Expected null primary but got surface=${primary.surface_id} offer=${primary.offer_type}.`);
    }
  } else if (expected.expected_surface_id) {
    if (!primary) errors.push(`Expected primary on ${expected.expected_surface_id} but primary is null.`);
    else if (primary.surface_id !== expected.expected_surface_id) {
      errors.push(`Expected primary surface ${expected.expected_surface_id}, got ${primary.surface_id}.`);
    }
  }

  if (primary && expected.expected_offer_type && primary.offer_type !== expected.expected_offer_type) {
    errors.push(`Expected offer_type ${expected.expected_offer_type}, got ${primary.offer_type}.`);
  }
  if (primary && expected.expected_message_angle && primary.message_angle !== expected.expected_message_angle) {
    errors.push(`Expected message_angle ${expected.expected_message_angle}, got ${primary.message_angle}.`);
  }
  if (primary && expected.expected_timing && primary.timing !== expected.expected_timing) {
    errors.push(`Expected timing ${expected.expected_timing}, got ${primary.timing}.`);
  }
  if (primary && expected.min_confidence != null && primary.confidence < expected.min_confidence) {
    errors.push(`Expected min_confidence ${expected.min_confidence}, got ${primary.confidence}.`);
  }
  if (primary && expected.max_confidence != null && primary.confidence > expected.max_confidence) {
    errors.push(`Expected max_confidence ${expected.max_confidence}, got ${primary.confidence}.`);
  }

  if (primary && expected.required_reason_terms?.length) {
    const joined = primary.reason.join(" ").toLowerCase();
    for (const term of expected.required_reason_terms) {
      if (!joined.includes(term.toLowerCase())) {
        errors.push(`Expected reason to contain "${term}".`);
      }
    }
  }

  assertForbiddenTerms(primaryBlob(primary), expected.forbidden_terms, errors);
  assertBadPatterns(primaryBlob(primary), bad, errors);

  if (expected.allowed_secondary_surface_ids?.length) {
    for (const d of envelope.secondary_decisions) {
      if (!expected.allowed_secondary_surface_ids.includes(d.surface_id)) {
        errors.push(
          `Secondary surface ${d.surface_id} is not in allowed_secondary_surface_ids (${expected.allowed_secondary_surface_ids.join(", ")}).`,
        );
      }
    }
  }

  if (envelope.secondary_decisions.length > 2) {
    errors.push(`At most 2 secondary decisions allowed, got ${envelope.secondary_decisions.length}.`);
  }

  if (expected.surface_slots) {
    for (const [surfaceId, want] of Object.entries(expected.surface_slots)) {
      const slot = slotDecisions[surfaceId];
      if (!slot) {
        errors.push(`Missing slot decision for surface ${surfaceId}.`);
        continue;
      }
      if (want !== "any" && slot.action !== want) {
        errors.push(`Surface ${surfaceId}: expected action ${want}, got ${slot.action}.`);
      }
    }
  }

  const queried = sessionInput.expected_surfaces_to_query ?? [];
  for (const sid of queried) {
    const slot = slotDecisions[sid];
    if (!slot) {
      errors.push(`Surface ${sid} from expected_surfaces_to_query not present in slot map.`);
      continue;
    }
    if (primary && primary.surface_id === sid && slot.action !== "show") {
      errors.push(`Primary surface ${sid} should be action show in slot map, got ${slot.action}.`);
    }
  }

  return {
    ok: errors.length === 0,
    fixtureName: sessionInput.name,
    verticalFolder,
    caseId,
    errors,
    primary,
    suppression_summary: envelope.suppression_summary,
    expectation: expectationSnapshot(expected),
  };
}
