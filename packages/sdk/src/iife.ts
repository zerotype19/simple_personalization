import * as api from "./index";

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
      const configUrl = script?.getAttribute("data-config") ?? undefined;
      const collectUrl = script?.getAttribute("data-collect") ?? undefined;
      const forceInspector =
        script?.getAttribute("data-inspector") === "true" ||
        window.location.search.includes("si_debug=1");
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
