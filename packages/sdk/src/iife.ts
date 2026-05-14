import * as api from "./index";
import { urlHasSiDebug } from "./si-debug";

/** Replaced at IIFE build time via `tsup` `define` (empty strings / false when unset). */
declare const __SI_EMBED_CONFIG_URL__: string;
declare const __SI_EMBED_COLLECT_URL__: string;
declare const __SI_EMBED_FORCE_INSPECTOR__: boolean;

declare global {
  interface Window {
    SessionIntel?: {
      boot: typeof api.boot;
      destroy: typeof api.destroy;
      getState: () => import("@si/shared").SessionProfile;
      subscribe: (cb: (p: import("@si/shared").SessionProfile) => void) => () => void;
      markConversion: (type?: string) => void;
      softResetSession: typeof api.softResetSession;
      getActivationPayload: typeof api.getActivationPayload;
      getPersonalizationSignal: typeof api.getPersonalizationSignal;
      pushToDataLayer: typeof api.pushToDataLayer;
      pushToAdobeDataLayer: typeof api.pushToAdobeDataLayer;
      pushToOptimizely: typeof api.pushToOptimizely;
      pushPersonalizationSignalToDataLayer: typeof api.pushPersonalizationSignalToDataLayer;
      pushPersonalizationSignalToAdobeDataLayer: typeof api.pushPersonalizationSignalToAdobeDataLayer;
      pushPersonalizationSignalToOptimizely: typeof api.pushPersonalizationSignalToOptimizely;
      pushPersonalizationSignalAll: typeof api.pushPersonalizationSignalAll;
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
      const configUrl = fromAttr("data-config") || __SI_EMBED_CONFIG_URL__ || undefined;
      const collectUrl = fromAttr("data-collect") || __SI_EMBED_COLLECT_URL__ || undefined;
      const forceInspector =
        script?.getAttribute("data-inspector") === "true" ||
        script?.getAttribute("data-inspector") === "1" ||
        urlHasSiDebug() ||
        __SI_EMBED_FORCE_INSPECTOR__;
      try {
        const rt = await api.boot({ configUrl, collectUrl, forceInspector });
        window.SessionIntel = {
          boot: api.boot,
          destroy: api.destroy,
          getState: () => rt.getState(),
          subscribe: (cb) => rt.subscribe(cb),
          markConversion: (t?: string) => rt.markConversion(t),
          softResetSession: () => api.softResetSession(),
          getActivationPayload: () => rt.getActivationPayload(),
          getPersonalizationSignal: () => rt.getPersonalizationSignal(),
          pushToDataLayer: () => rt.pushToDataLayer(),
          pushToAdobeDataLayer: () => rt.pushToAdobeDataLayer(),
          pushToOptimizely: () => rt.pushToOptimizely(),
          pushPersonalizationSignalToDataLayer: () => rt.pushPersonalizationSignalToDataLayer(),
          pushPersonalizationSignalToAdobeDataLayer: () => rt.pushPersonalizationSignalToAdobeDataLayer(),
          pushPersonalizationSignalToOptimizely: () => rt.pushPersonalizationSignalToOptimizely(),
          pushPersonalizationSignalAll: () => rt.pushPersonalizationSignalAll(),
        };
      } catch (err) {
        console.error("[Session Intelligence] boot failed", err);
        throw err;
      }
    },
  };
}

/** Hosted `si.js`: register `bootFromScriptTag` then run it (footer cannot run after `exports.boot` in the IIFE bundle). */
boot();
void window.SessionIntelBundle?.bootFromScriptTag?.();
