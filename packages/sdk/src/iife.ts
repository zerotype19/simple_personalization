import * as api from "./index";
import { urlHasSiDebug } from "./si-debug";

/** Replaced at IIFE build time via `tsup` `define` (empty strings / false when unset). */
declare const __SI_EMBED_CONFIG_URL__: string;
declare const __SI_EMBED_COLLECT_URL__: string;
declare const __SI_EMBED_FORCE_INSPECTOR__: boolean;

declare global {
  interface Window {
    /** Resolves when hosted `si.js` has finished `bootFromScriptTag` (SessionIntel ready). */
    __siBootFromTag?: Promise<void>;
    SessionIntel?: {
      boot: typeof api.boot;
      destroy: typeof api.destroy;
      getState: () => import("@si/shared").SessionProfile;
      subscribe: (cb: (p: import("@si/shared").SessionProfile) => void) => () => void;
      markConversion: (type?: string) => void;
      softResetSession: typeof api.softResetSession;
      getActivationPayload: typeof api.getActivationPayload;
      getPersonalizationSignal: typeof api.getPersonalizationSignal;
      getExperienceDecisionEnvelope: typeof api.getExperienceDecisionEnvelope;
      getExperienceDecision: typeof api.getExperienceDecision;
      getAllExperienceDecisions: typeof api.getAllExperienceDecisions;
      subscribeToDecision: typeof api.subscribeToDecision;
      subscribeToAllDecisions: typeof api.subscribeToAllDecisions;
      pushToDataLayer: typeof api.pushToDataLayer;
      pushToAdobeDataLayer: typeof api.pushToAdobeDataLayer;
      pushToOptimizely: typeof api.pushToOptimizely;
      pushPersonalizationSignalToDataLayer: typeof api.pushPersonalizationSignalToDataLayer;
      pushPersonalizationSignalToAdobeDataLayer: typeof api.pushPersonalizationSignalToAdobeDataLayer;
      pushPersonalizationSignalToOptimizely: typeof api.pushPersonalizationSignalToOptimizely;
      pushPersonalizationSignalAll: typeof api.pushPersonalizationSignalAll;
      pushExperienceDecisionToDataLayer: typeof api.pushExperienceDecisionToDataLayer;
      pushExperienceDecisionToAdobeDataLayer: typeof api.pushExperienceDecisionToAdobeDataLayer;
      pushExperienceDecisionToOptimizely: typeof api.pushExperienceDecisionToOptimizely;
    };
    SessionIntelBundle?: {
      bootFromScriptTag: () => Promise<void>;
    };
  }
}

export function boot(): void {
  window.SessionIntelBundle = {
    bootFromScriptTag: async () => {
      const script = document.currentScript as HTMLScriptElement | null;
      const fromAttr = (name: string) => script?.getAttribute(name)?.trim() || undefined;
      if (
        script?.getAttribute("data-si-debug") === "true" ||
        script?.getAttribute("data-si-debug") === "1"
      ) {
        try {
          window.sessionStorage?.setItem("si:debug", "1");
        } catch {
          /* storage blocked */
        }
      }
      const configUrl = fromAttr("data-config") || __SI_EMBED_CONFIG_URL__ || undefined;
      const collectUrl = fromAttr("data-collect") || __SI_EMBED_COLLECT_URL__ || undefined;
      const siteId = fromAttr("data-si-site") || undefined;
      const snippetKey = fromAttr("data-si-key") || fromAttr("data-si-snippet-key") || undefined;
      const forceInspector =
        script?.getAttribute("data-inspector") === "true" ||
        script?.getAttribute("data-inspector") === "1" ||
        urlHasSiDebug() ||
        __SI_EMBED_FORCE_INSPECTOR__;
      try {
        const rt = await api.boot({ configUrl, collectUrl, forceInspector, siteId, snippetKey });
        window.SessionIntel = {
          boot: api.boot,
          destroy: api.destroy,
          getState: () => rt.getState(),
          subscribe: (cb) => rt.subscribe(cb),
          markConversion: (t?: string) => rt.markConversion(t),
          softResetSession: () => api.softResetSession(),
          getActivationPayload: () => rt.getActivationPayload(),
          getPersonalizationSignal: () => rt.getPersonalizationSignal(),
          getExperienceDecisionEnvelope: () => rt.getExperienceDecisionEnvelope(),
          getExperienceDecision: (surfaceId: string) => rt.getExperienceDecision(surfaceId),
          getAllExperienceDecisions: () => rt.getAllExperienceDecisions(),
          subscribeToDecision: (surfaceId, cb) => rt.subscribeToDecision(surfaceId, cb),
          subscribeToAllDecisions: (cb) => rt.subscribeToAllDecisions(cb),
          pushToDataLayer: () => rt.pushToDataLayer(),
          pushToAdobeDataLayer: () => rt.pushToAdobeDataLayer(),
          pushToOptimizely: () => rt.pushToOptimizely(),
          pushPersonalizationSignalToDataLayer: () => rt.pushPersonalizationSignalToDataLayer(),
          pushPersonalizationSignalToAdobeDataLayer: () => rt.pushPersonalizationSignalToAdobeDataLayer(),
          pushPersonalizationSignalToOptimizely: () => rt.pushPersonalizationSignalToOptimizely(),
          pushPersonalizationSignalAll: () => rt.pushPersonalizationSignalAll(),
          pushExperienceDecisionToDataLayer: () => rt.pushExperienceDecisionToDataLayer(),
          pushExperienceDecisionToAdobeDataLayer: () => rt.pushExperienceDecisionToAdobeDataLayer(),
          pushExperienceDecisionToOptimizely: () => rt.pushExperienceDecisionToOptimizely(),
        };
      } catch (err) {
        console.error("[Session Intelligence] boot failed", err);
        throw err;
      }
    },
  };
}

/** Hosted `si.js`: register `bootFromScriptTag`, expose its promise, then start boot.
 * Dynamic loaders (e.g. demo CDN bridge) must await `__siBootFromTag` — `load` fires before async boot finishes. */
boot();
window.__siBootFromTag = window.SessionIntelBundle?.bootFromScriptTag?.() ?? Promise.resolve();
