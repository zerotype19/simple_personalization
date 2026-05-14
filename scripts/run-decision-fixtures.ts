#!/usr/bin/env node
/**
 * Runs decision fixtures from repo-root `decision-fixtures/` (or SI_DECISION_FIXTURES_ROOT).
 * Intended for CI and local QA; mirrors packages/sdk Vitest coverage.
 */
import { formatFixtureReport, runAllFixtures } from "../packages/sdk/src/decisioning/fixtures/runAllFixtures.ts";

const summary = runAllFixtures();
console.log(formatFixtureReport(summary));
if (summary.failed > 0) process.exit(1);
