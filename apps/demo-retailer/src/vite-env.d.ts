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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
