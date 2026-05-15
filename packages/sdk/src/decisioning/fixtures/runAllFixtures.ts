import fs from "node:fs";
import path from "node:path";
import { discoverFixtureCases, type FixtureDiscoveredCase } from "./discoverFixtures";
import { runFixtureCase } from "./runFixture";
import type { FixtureBadDecisionsFile, FixtureExpectedPrimary, FixtureRunResult, FixtureSessionInput } from "./types";

export interface RunAllFixturesSummary {
  total: number;
  passed: number;
  failed: number;
  results: ReturnType<typeof runFixtureCase>[];
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function runAllFixtures(root?: string): RunAllFixturesSummary {
  const cases = discoverFixtureCases(root);
  const results: ReturnType<typeof runFixtureCase>[] = [];
  for (const c of cases) {
    const session = readJson<FixtureSessionInput>(path.join(c.dir, "session-input.json"));
    const expected = readJson<FixtureExpectedPrimary>(path.join(c.dir, "expected-primary.json"));
    let bad: FixtureBadDecisionsFile | undefined;
    const badPath = path.join(c.dir, "bad-decisions.json");
    if (fs.existsSync(badPath)) bad = readJson<FixtureBadDecisionsFile>(badPath);
    results.push(runFixtureCase(c.verticalFolder, c.caseId, session, expected, bad));
  }
  const passed = results.filter((r) => r.ok).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

function formatExpectedVsActual(r: FixtureRunResult): string[] {
  const out: string[] = [];
  const ex = r.expectation;
  out.push("    expected vs actual:");
  if (ex.primaryMustBeNull) {
    out.push(
      `      primary: null (required) vs ${r.primary ? `surface=${r.primary.surface_id} offer=${r.primary.offer_type}` : "null"}`,
    );
  } else {
    out.push(`      surface: ${ex.expectedSurfaceId ?? "—"} vs ${r.primary?.surface_id ?? "null"}`);
    out.push(`      offer: ${ex.expectedOfferType ?? "—"} vs ${r.primary?.offer_type ?? "—"}`);
    out.push(`      timing: ${ex.expectedTiming ?? "—"} vs ${r.primary?.timing ?? "—"}`);
    if (ex.expectedMessageAngle) {
      out.push(`      message_angle: ${ex.expectedMessageAngle} vs ${r.primary?.message_angle ?? "—"}`);
    }
  }
  return out;
}

function partitionErrors(errors: string[]): { forbidden: string[]; reason: string[]; rest: string[] } {
  const forbidden: string[] = [];
  const reason: string[] = [];
  const rest: string[] = [];
  for (const e of errors) {
    if (e.includes("Forbidden term") || e.includes("Bad pattern")) forbidden.push(e);
    else if (e.includes("Expected reason to contain")) reason.push(e);
    else rest.push(e);
  }
  return { forbidden, reason, rest };
}

export function formatFixtureReport(summary: RunAllFixturesSummary): string {
  const lines: string[] = [];
  lines.push(`Decision fixtures: ${summary.total} total, ${summary.passed} passed, ${summary.failed} failed`);
  lines.push("");
  for (const r of summary.results) {
    const label = `${r.verticalFolder}/${r.caseId} — ${r.fixtureName}`;
    lines.push(r.ok ? `✓ ${label}` : `✗ ${label}`);
    if (r.ok && r.realism_warnings?.length) {
      for (const w of r.realism_warnings) lines.push(`    ! realism: ${w}`);
    }
    if (!r.ok) {
      lines.push(...formatExpectedVsActual(r));
      const { forbidden, reason, rest } = partitionErrors(r.errors);
      if (rest.length) {
        lines.push("    mismatches:");
        for (const e of rest) lines.push(`    - ${e}`);
      }
      if (reason.length) {
        lines.push("    reason / terms:");
        for (const e of reason) lines.push(`    - ${e}`);
      }
      if (forbidden.length) {
        lines.push("    forbidden term / bad-pattern violations:");
        for (const e of forbidden) lines.push(`    - ${e}`);
      }
      lines.push(`    actual primary: ${r.primary ? `${r.primary.surface_id} / ${r.primary.offer_type}` : "null"}`);
      if (r.suppression_summary) lines.push(`    suppression: ${r.suppression_summary.slice(0, 280)}`);
    }
  }
  return lines.join("\n");
}

export type { FixtureDiscoveredCase };
