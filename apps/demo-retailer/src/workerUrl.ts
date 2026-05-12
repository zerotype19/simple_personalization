/** Base URL for the Session Intelligence Worker (no trailing slash). When unset, use same-origin paths so the Vite dev proxy can reach localhost:8787. */
export function workerOrigin(): string {
  const raw = import.meta.env.VITE_SI_WORKER_URL as string | undefined;
  return raw?.trim().replace(/\/$/, "") ?? "";
}

export function workerUrl(path: string): string {
  if (!path.startsWith("/")) throw new Error(`workerUrl path must start with / (got ${path})`);
  const base = workerOrigin();
  return base ? `${base}${path}` : path;
}
