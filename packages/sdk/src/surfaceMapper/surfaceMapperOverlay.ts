import type { SurfaceRegion } from "./surfaceMapperTypes";
import { buildSurfaceDecisionPreview } from "./surfaceDecisionPreview";

const OVERLAY_ID = "si-surface-mapper-overlay";
const STORAGE_OVERLAY = "si:surface_mapper_overlay";

export function isOverlayEnabled(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(STORAGE_OVERLAY) === "1";
}

export function setOverlayEnabled(on: boolean): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_OVERLAY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ensureOverlayRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (el) return el;
  el = document.createElement("div");
  el.id = OVERLAY_ID;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "2147483640",
    overflow: "hidden",
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  return el;
}

function removeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
}

function placeHighlights(root: HTMLElement, regions: SurfaceRegion[]): void {
  root.replaceChildren();
  for (const r of regions) {
    let el: Element | null = null;
    try {
      el = document.querySelector(r.selector);
    } catch {
      el = null;
    }
    if (!el || !(el instanceof HTMLElement)) continue;
    const vr = el.getBoundingClientRect();
    if (vr.width * vr.height < 1) continue;

    const dec = r.current_decision;
    const pr = dec ? buildSurfaceDecisionPreview(dec) : null;
    const title = `${r.surface_id} · ${dec?.action ?? "—"}`;
    const box = document.createElement("div");
    box.className = "si-sm-box";
    box.title = pr
      ? `${title}\n${pr.headline}\nTiming: ${pr.timing}${pr.suppressionLine ? `\n${pr.suppressionLine}` : ""}`
      : title;
    Object.assign(box.style, {
      position: "fixed",
      left: `${vr.left}px`,
      top: `${vr.top}px`,
      width: `${vr.width}px`,
      height: `${vr.height}px`,
      boxSizing: "border-box",
      border: "2px solid rgba(59, 130, 246, 0.85)",
      borderRadius: "6px",
      background: "rgba(30, 58, 138, 0.12)",
      pointerEvents: "auto",
    } as CSSStyleDeclaration);
    const tag = document.createElement("div");
    tag.textContent = title;
    Object.assign(tag.style, {
      position: "absolute",
      left: "4px",
      top: "4px",
      maxWidth: "calc(100% - 8px)",
      font: "10px/1.2 system-ui, sans-serif",
      color: "#e2e8f0",
      background: "rgba(15, 23, 42, 0.92)",
      padding: "3px 6px",
      borderRadius: "4px",
      pointerEvents: "none",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    } as CSSStyleDeclaration);
    box.appendChild(tag);
    root.appendChild(box);
  }
}

let scrollListener: (() => void) | null = null;

/** Draw or refresh highlight boxes from viewport-relative geometry. */
export function updateSurfaceMapperOverlay(regions: SurfaceRegion[]): void {
  if (!isOverlayEnabled()) {
    removeOverlay();
    if (scrollListener) {
      window.removeEventListener("scroll", scrollListener, true);
      window.removeEventListener("resize", scrollListener);
      scrollListener = null;
    }
    return;
  }
  const root = ensureOverlayRoot();
  if (!root) return;
  placeHighlights(root, regions);
  if (!scrollListener) {
    scrollListener = () => {
      if (!isOverlayEnabled()) return;
      const r = document.getElementById(OVERLAY_ID);
      if (!r) return;
      /* Re-query live rects would need regions refreshed from caller — lightweight: hide until next render tick. */
    };
    window.addEventListener("scroll", scrollListener, true);
    window.addEventListener("resize", scrollListener);
  }
}

export function destroySurfaceMapperOverlay(): void {
  removeOverlay();
  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener, true);
    window.removeEventListener("resize", scrollListener);
    scrollListener = null;
  }
}
