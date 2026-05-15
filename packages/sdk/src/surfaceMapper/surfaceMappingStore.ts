import type { SurfaceMapping } from "./surfaceMapperTypes";

export const SURFACE_MAPPINGS_STORAGE_KEY = "si:surface_mappings";

interface SerializedRoot {
  v: 1;
  pages: Record<string, SurfaceMapping[]>;
}

function emptyRoot(): SerializedRoot {
  return { v: 1, pages: {} };
}

function readRoot(): SerializedRoot {
  if (typeof sessionStorage === "undefined") return emptyRoot();
  try {
    const raw = sessionStorage.getItem(SURFACE_MAPPINGS_STORAGE_KEY);
    if (!raw) return emptyRoot();
    const parsed = JSON.parse(raw) as SerializedRoot;
    if (!parsed || parsed.v !== 1 || typeof parsed.pages !== "object") return emptyRoot();
    return parsed;
  } catch {
    return emptyRoot();
  }
}

function writeRoot(root: SerializedRoot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SURFACE_MAPPINGS_STORAGE_KEY, JSON.stringify(root));
  } catch {
    /* quota / privacy mode */
  }
}

/** Host + path only (no query), per product spec. */
export function getPageMappingKey(): string {
  if (typeof location === "undefined") return "|";
  return `${location.hostname}|${location.pathname}`;
}

export function loadMappingsForPage(pageKey = getPageMappingKey()): SurfaceMapping[] {
  const root = readRoot();
  return [...(root.pages[pageKey] ?? [])];
}

export function saveMappingsForPage(mappings: SurfaceMapping[], pageKey = getPageMappingKey()): void {
  const root = readRoot();
  root.pages[pageKey] = mappings.map((m) => ({ ...m }));
  writeRoot(root);
}

export function clearMappingsForPage(pageKey = getPageMappingKey()): void {
  const root = readRoot();
  delete root.pages[pageKey];
  writeRoot(root);
}

export function addMapping(mapping: SurfaceMapping, pageKey = getPageMappingKey()): void {
  const cur = loadMappingsForPage(pageKey);
  const next = cur.filter((m) => m.selector !== mapping.selector);
  next.push(mapping);
  saveMappingsForPage(next, pageKey);
}

export function dispatchSurfaceMapUpdated(pageKey = getPageMappingKey()): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("si:surface-map-updated", { detail: { pageKey } }));
  } catch {
    /* ignore */
  }
}
