import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface FixtureDiscoveredCase {
  verticalFolder: string;
  caseId: string;
  dir: string;
}

/** Repo-root `decision-fixtures/` (works from Vitest cwd or `tsx` from repo root). */
export function decisionFixturesRoot(): string {
  const env = process.env.SI_DECISION_FIXTURES_ROOT?.trim();
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "decision-fixtures");
}

export function discoverFixtureCases(root = decisionFixturesRoot()): FixtureDiscoveredCase[] {
  const out: FixtureDiscoveredCase[] = [];
  if (!fs.existsSync(root)) return out;
  for (const vertical of fs.readdirSync(root, { withFileTypes: true })) {
    if (!vertical.isDirectory()) continue;
    if (vertical.name === "node_modules" || vertical.name.startsWith(".")) continue;
    const vPath = path.join(root, vertical.name);
    for (const c of fs.readdirSync(vPath, { withFileTypes: true })) {
      if (!c.isDirectory()) continue;
      const dir = path.join(vPath, c.name);
      const sessionFile = path.join(dir, "session-input.json");
      if (!fs.existsSync(sessionFile)) continue;
      out.push({ verticalFolder: vertical.name, caseId: c.name, dir });
    }
  }
  out.sort((a, b) =>
    `${a.verticalFolder}/${a.caseId}`.localeCompare(`${b.verticalFolder}/${b.caseId}`),
  );
  return out;
}

/** Resolve fixtures root relative to this module (SDK tests). */
export function decisionFixturesRootFromSdkTests(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../decision-fixtures");
}
