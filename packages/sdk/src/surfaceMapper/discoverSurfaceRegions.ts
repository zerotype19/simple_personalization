import type { ExperienceDecision } from "@si/shared";
import type { SurfaceMapping, SurfaceRegion, SurfaceRegionBounds, SurfaceRegionSource } from "./surfaceMapperTypes";

const MIN_AREA_PX = 400;
const INSPECTOR_ROOT_ID = "si-inspector-root";
const DATA_ATTR = "data-si-surface";

export type SurfaceDiscoverLayoutStub = {
  /** Return visible layout area in px² (used by tests when DOM layout APIs lie). */
  visibleArea(el: HTMLElement): number;
};

export interface DiscoverOptions {
  /** Extra selectors from demo fixtures (treated like attributes). */
  demoSelectors?: Array<{ selector: string; surface_id: string; label: string }>;
  /** Optional layout override (unit tests). Production omits this. */
  layoutStub?: SurfaceDiscoverLayoutStub;
}

function isInsideInspector(el: Element): boolean {
  return !!(
    el.closest(`#${INSPECTOR_ROOT_ID}`) ||
    el.closest("#si-inspector-panel") ||
    el.closest("#si-inspector-launcher") ||
    el.closest("#si-surface-mapper-overlay")
  );
}

function isHiddenElement(el: HTMLElement, layoutStub?: SurfaceDiscoverLayoutStub): boolean {
  if (!el.isConnected) return true;
  const st = window.getComputedStyle(el);
  if (st.display === "none" || st.visibility === "hidden") return true;
  const op = Number.parseFloat(st.opacity);
  if (!Number.isNaN(op) && op === 0) return true;
  if (!layoutStub) {
    const rects = el.getClientRects();
    if (!rects || rects.length === 0) return true;
    if (el.offsetParent === null && st.position !== "fixed") {
      const tag = el.tagName.toLowerCase();
      if (tag !== "html" && tag !== "body") return true;
    }
  }
  return false;
}

function areaOf(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return Math.max(0, r.width) * Math.max(0, r.height);
}

function buildElementPath(el: Element, maxDepth = 8): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  let d = 0;
  while (cur && cur.nodeType === 1 && d < maxDepth) {
    const tag = cur.tagName.toLowerCase();
    const id = cur.id && !cur.id.startsWith("si-") ? `#${cur.id}` : "";
    parts.unshift(id ? `${tag}${id}` : tag);
    cur = cur.parentElement;
    if (cur?.tagName?.toLowerCase() === "body") break;
    d++;
  }
  return parts.join(" > ");
}

/** Stable-ish CSS path: prefer id, else tag:nth-of-type chain upward. */
export function buildCssSelector(el: Element): string {
  if (!(el instanceof Element)) return "";
  if (el instanceof HTMLElement && el.id && !el.id.startsWith("si-")) {
    try {
      return `#${CSS.escape(el.id)}`;
    } catch {
      return `#${el.id.replace(/([^a-zA-Z0-9_-])/g, "\\$1")}`;
    }
  }
  const segments: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < 7) {
    const tag = cur.tagName.toLowerCase();
    const parent: Element | null = cur.parentElement;
    if (!parent) {
      segments.unshift(tag);
      break;
    }
    const sameTag = [...parent.children].filter((c) => c.tagName === cur!.tagName);
    const idx = sameTag.indexOf(cur) + 1;
    segments.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
    cur = parent;
    depth++;
    if (tag === "body") break;
  }
  return segments.join(" > ");
}

function boundsFor(el: HTMLElement): SurfaceRegionBounds {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + window.scrollX,
    y: r.top + window.scrollY,
    width: r.width,
    height: r.height,
  };
}

function regionId(source: SurfaceRegionSource, surfaceId: string, selector: string, idx: number): string {
  const h = surfaceId.length + selector.length + source.length + String(idx).length;
  return `si-sr-${source}-${idx}-${h}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Scan `[data-si-surface]`, apply saved mappings, optional demo hints.
 * Ignores hidden, tiny, and inspector-owned DOM.
 */
export function discoverSurfaceRegions(
  doc: Document,
  mappings: SurfaceMapping[],
  options: DiscoverOptions = {},
): SurfaceRegion[] {
  const seen = new Set<Element>();
  const out: SurfaceRegion[] = [];
  let idx = 0;

  const pushRegion = (el: HTMLElement, surfaceId: string, source: SurfaceRegionSource, labelHint?: string) => {
    if (seen.has(el)) return;
    if (isInsideInspector(el)) return;
    if (isHiddenElement(el, options.layoutStub)) return;
    const area = options.layoutStub?.visibleArea(el) ?? areaOf(el);
    if (area < MIN_AREA_PX) return;
    seen.add(el);
    const selector = buildCssSelector(el);
    const label = (labelHint ?? surfaceId.replace(/_/g, " ")).trim() || surfaceId;
    out.push({
      id: regionId(source, surfaceId, selector, idx++),
      surface_id: surfaceId,
      label,
      selector,
      element_path: buildElementPath(el),
      source,
      bounds: boundsFor(el),
    });
  };

  doc.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`).forEach((el) => {
    const sid = (el.getAttribute(DATA_ATTR) ?? "").trim();
    if (!sid) return;
    pushRegion(el, sid, "attribute");
  });

  for (const m of mappings) {
    let el: Element | null = null;
    try {
      el = doc.querySelector(m.selector);
    } catch {
      el = null;
    }
    if (!el || !(el instanceof HTMLElement)) continue;
    pushRegion(el, m.surface_id, m.source === "demo" ? "demo" : "inspector", m.label);
  }

  for (const d of options.demoSelectors ?? []) {
    let el: Element | null = null;
    try {
      el = doc.querySelector(d.selector);
    } catch {
      el = null;
    }
    if (!el || !(el instanceof HTMLElement)) continue;
    pushRegion(el, d.surface_id, "demo", d.label);
  }

  return out;
}

export function attachDecisionsToRegions(
  regions: SurfaceRegion[],
  getDecision: (surfaceId: string) => ExperienceDecision,
): SurfaceRegion[] {
  return regions.map((r) => ({
    ...r,
    current_decision: getDecision(r.surface_id),
  }));
}
