/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full origin of the deployed Worker, e.g. https://api.optiview.ai */
  readonly VITE_SI_WORKER_URL?: string;
  /** Where production si.js is hosted (baked into snippet + demo CDN bridge), e.g. https://cdn.optiview.ai */
  readonly VITE_SI_SNIPPET_ORIGIN?: string;
  /** When "1", production demo loads si.js from VITE_SI_SNIPPET_ORIGIN via Vite alias bridge. */
  readonly VITE_SI_DEMO_USE_HOSTED_SNIPPET?: string;
  /** When "1", adds data-inspector="1" to the dynamically loaded snippet script (CDN demo builds). */
  readonly VITE_SI_DEMO_SNIPPET_INSPECTOR?: string;
  /** Demo-only: cache-bust query for hosted `si.js` (prefer CDN `version.json` commit at deploy). */
  readonly VITE_SI_SNIPPET_VERSION?: string;
  /** Demo-only fallback for snippet cache-bust when `VITE_SI_SNIPPET_VERSION` is unset. */
  readonly VITE_GIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __SI_DEMO_GIT_SHA__: string;
declare const __SI_SDK_GIT_SHA__: string;
declare const __SI_SNIPPET_GIT_SHA__: string;
