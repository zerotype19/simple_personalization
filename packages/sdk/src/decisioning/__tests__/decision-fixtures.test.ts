import { describe, expect, it } from "vitest";
import { decisionFixturesRootFromSdkTests } from "../fixtures/discoverFixtures";
import { formatFixtureReport, runAllFixtures } from "../fixtures/runAllFixtures";

describe("decision fixtures QA", () => {
  it("all decision fixtures pass", () => {
    const summary = runAllFixtures(decisionFixturesRootFromSdkTests());
    expect(summary.total).toBeGreaterThanOrEqual(22);
    if (summary.failed > 0) {
      // eslint-disable-next-line no-console
      console.log(formatFixtureReport(summary));
    }
    expect(summary.failed, formatFixtureReport(summary)).toBe(0);
  });
});
