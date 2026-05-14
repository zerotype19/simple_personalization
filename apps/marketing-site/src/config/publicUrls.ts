/** Public URLs — override at build time with VITE_SI_* env vars. */
export const CDN_URL = (import.meta.env.VITE_SI_CDN_URL ?? "https://cdn.optiview.ai").replace(/\/+$/, "");
export const DEMO_URL = (import.meta.env.VITE_SI_DEMO_URL ?? "https://demo.optiview.ai").replace(/\/+$/, "");
export const DASHBOARD_URL = (import.meta.env.VITE_SI_DASHBOARD_URL ?? "https://dashboard.optiview.ai").replace(
  /\/+$/,
  "",
);
export const API_URL = (import.meta.env.VITE_SI_API_URL ?? "https://api.optiview.ai").replace(/\/+$/, "");
