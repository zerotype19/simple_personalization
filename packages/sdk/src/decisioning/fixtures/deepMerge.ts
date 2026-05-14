export function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base } as T;
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key];
    if (pv === undefined) continue;
    const bv = out[key];
    if (pv && typeof pv === "object" && !Array.isArray(pv) && bv && typeof bv === "object" && !Array.isArray(bv)) {
      (out as Record<string, unknown>)[key as string] = deepMerge(bv as Record<string, unknown>, pv as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[key as string] = pv as unknown;
    }
  }
  return out;
}
