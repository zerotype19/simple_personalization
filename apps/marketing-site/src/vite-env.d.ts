/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SI_CDN_URL?: string;
  readonly VITE_SI_DEMO_URL?: string;
  readonly VITE_SI_DASHBOARD_URL?: string;
  readonly VITE_SI_API_URL?: string;
  readonly VITE_SI_API_DEV_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
