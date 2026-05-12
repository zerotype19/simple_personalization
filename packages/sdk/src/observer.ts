import type { PageType, SessionProfile } from "@si/shared";

type Update = (mut: (p: SessionProfile) => void) => void;

/**
 * Wire up DOM observers and event listeners. We aim for low-frequency,
 * high-signal events rather than streaming raw telemetry.
 */
export function startObserver(getPageType: () => PageType, update: Update): () => void {
  const start = Date.now();

  const tickDuration = window.setInterval(() => {
    update((p) => {
      p.signals.session_duration_ms = Date.now() - start;
    });
  }, 5000);

  const scrollHandler = throttle(() => {
    const docHeight = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );
    const pct = Math.min(100, Math.round((window.scrollY / docHeight) * 100));
    update((p) => {
      if (pct > p.signals.max_scroll_depth) p.signals.max_scroll_depth = pct;
    });
  }, 400);
  window.addEventListener("scroll", scrollHandler, { passive: true });

  const clickHandler = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const ctaEl = target.closest<HTMLElement>(
      "[data-si-cta], button.primary, a.cta",
    );
    if (ctaEl) {
      const role = ctaEl.getAttribute("data-si-cta") ?? "generic";
      update((p) => {
        p.signals.cta_clicks++;
        if (role === "finance") p.signals.finance_interactions++;
        if (role === "compare") p.signals.compare_interactions++;
      });
    }
    if (target.closest("[data-si-price]")) {
      update((p) => p.signals.pricing_views++);
    }
    if (target.closest("[data-si-compare-item]")) {
      update((p) => p.signals.compare_interactions++);
    }
    if (target.closest("[data-si-finance]")) {
      update((p) => p.signals.finance_interactions++);
    }
  };
  document.addEventListener("click", clickHandler, { passive: true, capture: true });

  const formHandler = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest("[data-si-finance]")) {
      update((p) => p.signals.finance_interactions++);
    }
  };
  document.addEventListener("input", throttle(formHandler, 800), { passive: true });

  // Track page view per virtual navigation as well as initial load.
  let lastUrl = window.location.href;
  const observePage = () => {
    const url = window.location.href;
    if (url === lastUrl) return;
    lastUrl = url;
    update((p) => {
      const t = getPageType();
      p.page_type = t;
      p.signals.pages_viewed++;
      if (t === "vdp") p.signals.vdp_views++;
      if (t === "finance") p.signals.finance_interactions++;
      if (t === "compare") p.signals.compare_interactions++;
    });
  };
  // Initial increment
  update((p) => {
    p.signals.pages_viewed = Math.max(1, p.signals.pages_viewed + 1);
    const t = getPageType();
    if (t === "vdp") p.signals.vdp_views++;
  });

  const popHandler = () => observePage();
  window.addEventListener("popstate", popHandler);

  // Listen for SPA-style pushState
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof origPush>) {
    const r = origPush.apply(this, args);
    queueMicrotask(observePage);
    return r;
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    const r = origReplace.apply(this, args);
    queueMicrotask(observePage);
    return r;
  };

  return () => {
    window.clearInterval(tickDuration);
    window.removeEventListener("scroll", scrollHandler);
    document.removeEventListener("click", clickHandler, true);
    window.removeEventListener("popstate", popHandler);
    history.pushState = origPush;
    history.replaceState = origReplace;
  };
}

function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let timer: number | null = null;
  let pending: any[] | null = null;
  const run = () => {
    last = Date.now();
    timer = null;
    if (pending) {
      fn(...pending);
      pending = null;
    }
  };
  return ((...args: any[]) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else {
      pending = args;
      if (!timer) timer = window.setTimeout(run, remaining);
    }
  }) as T;
}
