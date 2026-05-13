import * as api from "./index";

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
        window.location.search.includes("si_debug=1") ||
        __SI_EMBED_FORCE_INSPECTOR__;
      const rt = await api.boot({ configUrl, collectUrl, forceInspector });
      window.SessionIntel = {
        boot: api.boot,
        destroy: api.destroy,
        getState: () => rt.getState(),
        subscribe: (cb) => rt.subscribe(cb),
        markConversion: (t?: string) => rt.markConversion(t),
        softResetSession: () => api.softResetSession(),
      };
    },
  };
}
