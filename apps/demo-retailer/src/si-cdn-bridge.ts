/**
 * When the demo is built with `VITE_SI_DEMO_USE_HOSTED_SNIPPET=1`, Vite aliases `@si/sdk` here so
 * Velocity runs the same hosted `si.js` publishers use (CDN origin) while reusing tree-shaken
 * rule helpers from the SDK source. No inference changes — wiring only.
 */
import type { BootOptions, SessionIntelRuntime } from "../../../packages/sdk/src/runtime";

export { buildRuleContext, evaluateExpression } from "../../../packages/sdk/src/rules";

const SNIPPET_ORIGIN = (import.meta.env.VITE_SI_SNIPPET_ORIGIN as string | undefined)
  ?.trim()
  .replace(/\/+$/, "");

declare global {
  interface Window {
    __siBootFromTag?: Promise<void>;
    SessionIntel?: {
      getState: () => import("@si/shared").SessionProfile;
      subscribe: (cb: (p: import("@si/shared").SessionProfile) => void) => () => void;
      markConversion: (type?: string) => void;
      softResetSession: () => void;
    };
  }
}

function loadSnippet(): Promise<void> {
  if (typeof window !== "undefined" && window.SessionIntel) return Promise.resolve();
  if (!SNIPPET_ORIGIN) {
    return Promise.reject(
      new Error("VITE_SI_SNIPPET_ORIGIN is required when using the CDN snippet bridge."),
    );
  }
  const src = `${SNIPPET_ORIGIN}/si.js`;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    if (import.meta.env.VITE_SI_DEMO_SNIPPET_INSPECTOR === "1") {
      s.setAttribute("data-inspector", "1");
    }
    s.onload = () => {
      void (async () => {
        try {
          const p = window.__siBootFromTag;
          if (p && typeof p.then === "function") {
            await p;
          } else {
            await waitForSessionIntel();
          }
          if (!window.SessionIntel) {
            reject(new Error("Session Intelligence did not initialize after si.js load"));
            return;
          }
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    };
    s.onerror = () => reject(new Error(`Failed to load Session Intelligence snippet: ${src}`));
    document.head.appendChild(s);
  });
}

async function waitForSessionIntel(timeoutMs = 25_000): Promise<void> {
  const start = Date.now();
  while (!window.SessionIntel) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Session Intelligence did not become ready after si.js load (timeout)");
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}

function api() {
  const w = window.SessionIntel;
  if (!w) throw new Error("Session Intelligence not booted (load si.js first)");
  return w;
}

/** Loads CDN `si.js` (baked Worker + CSS URLs). `opts` are ignored — the IIFE owns config/collect. */
export async function boot(_opts: BootOptions = {}): Promise<SessionIntelRuntime> {
  await loadSnippet();
  api();
  return {} as SessionIntelRuntime;
}

export function getState() {
  return api().getState();
}

export function subscribe(cb: (p: import("@si/shared").SessionProfile) => void) {
  return api().subscribe(cb);
}

export function markConversion(type?: string) {
  api().markConversion(type);
}

export function softResetSession() {
  api().softResetSession();
}
