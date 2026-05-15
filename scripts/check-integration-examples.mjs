#!/usr/bin/env node
/**
 * Static checks so integration docs/examples stay aligned with the public browser API.
 * Run from repo root: pnpm check:integrations
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const TARGETS = [
  path.join(ROOT, "docs", "integrations"),
  path.join(ROOT, "examples", "integrations"),
];

const EXT = new Set([
  ".md",
  ".html",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".liquid",
]);

/** Public `window.SessionIntel` surface (IIFE) + common `boot` re-export. */
const ALLOWED_SESSION_INTEL = new Set([
  "boot",
  "destroy",
  "getState",
  "subscribe",
  "markConversion",
  "softResetSession",
  "getActivationPayload",
  "getPersonalizationSignal",
  "getExperienceDecisionEnvelope",
  "getExperienceDecision",
  "getAllExperienceDecisions",
  "getDecisionReplayFrames",
  "runDecisionReplay",
  "buildOperatorSessionStory",
  "subscribeToDecision",
  "subscribeToAllDecisions",
  "pushToDataLayer",
  "pushToAdobeDataLayer",
  "pushToOptimizely",
  "pushPersonalizationSignalToDataLayer",
  "pushPersonalizationSignalToAdobeDataLayer",
  "pushPersonalizationSignalToOptimizely",
  "pushPersonalizationSignalAll",
  "pushExperienceDecisionToDataLayer",
  "pushExperienceDecisionToAdobeDataLayer",
  "pushExperienceDecisionToOptimizely",
]);

/** Symbols valid in `import { … } from "@si/sdk"` (values + common types). */
const ALLOWED_SDK_IMPORT = new Set([
  ...ALLOWED_SESSION_INTEL,
  "ExperienceDecision",
  "ExperienceDecisionEnvelope",
  "BootOptions",
  "SessionIntelRuntime",
]);

const FORBIDDEN_IDENTITY = [
  /\bfingerprinting\b/i,
  /\bfingerprint\b/i,
  /\bidentity\s+resolution\b/i,
  /\bprobabilistic\s+(?:match|identifier)\b/i,
  /\bdevice\s+graph\b/i,
  /\bcross[- ]device\s+(?:id|identity)\b/i,
];

const STORAGE = [/\blocalStorage\b/, /\bsessionStorage\b/, /\bdocument\.cookie\b/i];

/** Misleading: first argument to subscribeToDecision is the envelope, not the per-surface decision. */
const BAD_SUBSCRIBE_PARAM = [
  /subscribeToDecision\s*\(\s*["'`][^"'`]+["'`]\s*,\s*(?:async\s+)?\(\s*decision\s*\)/i,
  /subscribeToDecision\s*\(\s*["'`][^"'`]+["'`]\s*,\s*(?:async\s+)?function\s*\(\s*decision\s*\)/i,
];

const DOM_HINT =
  /\b(hidden|\.hidden|style\.display|appendChild|innerHTML|insertAdjacent|textContent\s*=|removeChild|createElement)\b/;
const REACT_RENDER = /\breturn\s*\(\s*</;
const HAS_SURFACE_SUB = /subscribeToDecision\s*\(/;
const HAS_GET_EXP = /getExperienceDecision\s*\(/;

const SHOW_GATE =
  /(?:\?\.action|\.action)\s*===\s*["']show["']|(?:\?\.action|\.action)\s*!==\s*["']show["']/;

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else if (EXT.has(path.extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

function fail(issues, rel, msg) {
  issues.push(`${rel}: ${msg}`);
}

/** @param {string} inner e.g. " a, type B, C as D " */
function parseNamedImports(inner) {
  const out = [];
  for (const raw of inner.split(",")) {
    let s = raw.trim();
    if (!s) continue;
    s = s.replace(/^\s*type\s+/, "").trim();
    const asIdx = s.indexOf(" as ");
    if (asIdx !== -1) s = s.slice(0, asIdx).trim();
    const name = s.split(/\s+/)[0];
    if (name) out.push(name);
  }
  return out;
}

function checkSdkImports(text, rel, issues) {
  const re = /\bimport\s+(?:type\s*)?\{([^}]+)\}\s*from\s*["']@si\/sdk["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    for (const name of parseNamedImports(m[1])) {
      if (!ALLOWED_SDK_IMPORT.has(name)) {
        fail(issues, rel, `unknown @si/sdk import "${name}" (drift from public package exports)`);
      }
    }
  }
}

function main() {
  const issues = [];
  const files = TARGETS.flatMap((d) => walkFiles(d));

  if (!files.length) {
    console.error("check-integration-examples: no files found under docs/examples integrations");
    process.exit(1);
  }

  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    const text = fs.readFileSync(abs, "utf8");

    for (const rx of FORBIDDEN_IDENTITY) {
      if (rx.test(text)) fail(issues, rel, `forbidden phrase (identity / fingerprinting): ${rx}`);
    }

    for (const rx of STORAGE) {
      if (rx.test(text)) fail(issues, rel, `forbidden storage API in integration examples: ${rx}`);
    }

    for (const rx of BAD_SUBSCRIBE_PARAM) {
      if (rx.test(text)) {
        fail(
          issues,
          rel,
          "subscribeToDecision callback must not use `decision` as the first param — envelope is not the per-surface decision; use () => { const d = getExperienceDecision(surfaceId); }",
        );
      }
    }

    checkSdkImports(text, rel, issues);

    const siCalls = [...text.matchAll(/\bSessionIntel\.(\w+)\b/g)].map((m) => m[1]);
    for (const name of siCalls) {
      if (!ALLOWED_SESSION_INTEL.has(name)) {
        fail(issues, rel, `unknown SessionIntel API "${name}" (typo or drift from public IIFE surface)`);
      }
    }

    if (HAS_SURFACE_SUB.test(text) && !HAS_GET_EXP.test(text)) {
      fail(
        issues,
        rel,
        "files using subscribeToDecision must call getExperienceDecision(surfaceId) (callback receives envelope only)",
      );
    }

    const touchesDom = DOM_HINT.test(text) || REACT_RENDER.test(text);
    if (touchesDom && HAS_GET_EXP.test(text) && !SHOW_GATE.test(text)) {
      fail(
        issues,
        rel,
        'surface rendering must gate on action === "show" or hide when action !== "show" (suppression)',
      );
    }

    if (touchesDom && HAS_SURFACE_SUB.test(text) && !SHOW_GATE.test(text)) {
      fail(
        issues,
        rel,
        'subscribeToDecision + DOM update requires explicit show/suppress handling (e.g. action === "show")',
      );
    }

    if (/\bSessionIntel\.getExperience(?!Decision)/.test(text)) {
      fail(
        issues,
        rel,
        "possible invalid SessionIntel.getExperience* call (expected getExperienceDecision / getExperienceDecisionEnvelope)",
      );
    }
  }

  if (issues.length) {
    console.error("check-integration-examples: failed\n\n" + issues.join("\n") + "\n");
    process.exit(1);
  }
  console.log(`check-integration-examples: OK (${files.length} files)`);
}

main();
