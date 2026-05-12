import { SessionIntelRuntime, type BootOptions } from "./runtime";

let singleton: SessionIntelRuntime | null = null;

export type { BootOptions };
export { SessionIntelRuntime };

export async function boot(opts: BootOptions = {}): Promise<SessionIntelRuntime> {
  if (singleton) return singleton;
  singleton = new SessionIntelRuntime(opts);
  await singleton.boot();
  return singleton;
}

export function destroy(): void {
  singleton?.destroy();
  singleton = null;
}

export function getState() {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getState();
}

export function subscribe(cb: (p: import("@si/shared").SessionProfile) => void) {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.subscribe(cb);
}

export function markConversion(type?: string) {
  singleton?.markConversion(type);
}

/** Clear `si:session`, new anonymous session, new A/B draw, re-score — no page reload. */
export function softResetSession(): void {
  singleton?.softResetSession();
}

export { buildRuleContext, evaluateExpression } from "./rules";
export { DEFAULT_CONFIG } from "./defaults";
export { resetProfile, SI_SESSION_STORAGE_KEY } from "./session";
export { clearTreatments } from "./personalization";
