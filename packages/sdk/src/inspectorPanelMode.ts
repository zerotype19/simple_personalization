import { urlHasSiDebug } from "./si-debug";

export type InspectorPanelMode = "buyer" | "operator";

export const INSPECTOR_MODE_STORAGE_KEY = "si:inspector_mode";

/** In-memory toggle during a debug page session (not persisted; reload resets). */
let debugSessionOverride: InspectorPanelMode | null = null;

/** @internal test helper */
export function resetInspectorPanelModeState(): void {
  debugSessionOverride = null;
}

export function isDebugInspectorContext(): boolean {
  return urlHasSiDebug();
}

export function getInspectorPanelMode(): InspectorPanelMode {
  if (isDebugInspectorContext()) {
    if (debugSessionOverride !== null) return debugSessionOverride;
    return "operator";
  }
  try {
    const v = window.sessionStorage?.getItem(INSPECTOR_MODE_STORAGE_KEY);
    if (v === "buyer" || v === "operator") return v;
  } catch {
    /* storage blocked */
  }
  return "buyer";
}

export function setInspectorPanelMode(mode: InspectorPanelMode): void {
  if (isDebugInspectorContext()) {
    debugSessionOverride = mode;
    return;
  }
  debugSessionOverride = null;
  try {
    window.sessionStorage?.setItem(INSPECTOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage blocked */
  }
}
