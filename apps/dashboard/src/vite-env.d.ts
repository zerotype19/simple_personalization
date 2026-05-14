/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full origin of the deployed Worker, e.g. https://api.optiview.ai */
  readonly VITE_SI_WORKER_URL?: string;
  /** CDN origin for install snippet preview, e.g. https://cdn.optiview.ai */
  readonly VITE_SI_SNIPPET_ORIGIN?: string;
  /** Injected by Vite dev proxy as X-SI-Dev-Access-Email when calling /dashboard/* (must match D1 authorized_users). */
  readonly VITE_SI_DEV_ACCESS_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
