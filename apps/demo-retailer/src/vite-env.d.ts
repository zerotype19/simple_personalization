/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full origin of the deployed Worker, e.g. https://session-intelligence-worker.your-subdomain.workers.dev */
  readonly VITE_SI_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
