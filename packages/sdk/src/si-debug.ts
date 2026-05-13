/** True when the user asked for SI debug UI (inspector + logs). */
export function urlHasSiDebug(): boolean {
  try {
    if (typeof window === "undefined" || !window.location) return false;
    if (window.location.search.includes("si_debug=1")) return true;
    if (window.sessionStorage?.getItem("si:debug") === "1") return true;
  } catch {
    /* storage blocked */
  }
  return false;
}

export function logSiDebug(...args: unknown[]): void {
  if (!urlHasSiDebug()) return;
  console.info("[Session Intelligence]", ...args);
}
