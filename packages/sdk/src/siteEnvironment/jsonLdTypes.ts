/** Collects schema.org `@type` values (no raw JSON persisted). */
export function collectJsonLdTypes(): string[] {
  if (typeof document === "undefined") return [];
  const types = new Set<string>();
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      const walk = (v: unknown): void => {
        if (!v || typeof v !== "object") return;
        if (Array.isArray(v)) {
          for (const x of v) walk(x);
          return;
        }
        const o = v as Record<string, unknown>;
        const t = o["@type"];
        if (typeof t === "string") types.add(t);
        else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.add(x);
        for (const x of Object.values(o)) walk(x);
      };
      walk(JSON.parse(raw) as unknown);
    } catch {
      /* ignore */
    }
  }
  return [...types].slice(0, 12);
}
