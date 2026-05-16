import type { PageType, SessionProfile } from "@si/shared";
import {
  classifyCtaElement,
  classifyFormIntent,
  updateCommercialIntentFromForm,
  updateCommercialIntentMemory,
} from "./commercialIntent";
import { buyerSafeFormTimelineLabel } from "./commercialIntent/formTimelineLabels";
import { pushIntelEvent } from "./sessionIntel";

type Update = (mut: (p: SessionProfile) => void) => void;

export type ObserverOptions = {
  getVertical?: () => import("@si/shared").SiteVertical;
};

/** Clicks often target `Text` nodes; `closest` exists only on `Element`. */
function eventTargetElement(ev: Event): Element | null {
  const t = ev.target;
  if (!t || !(t instanceof Node)) return null;
  return t.nodeType === Node.ELEMENT_NODE ? (t as Element) : t.parentElement;
}

/** Clicks on try/demo/lab-style controls often sit outside `<main>` (hero, header). */
const GENERIC_DATA_SI_MARKERS = new Set(["primary", "secondary", "tertiary", "default"]);

function hasExplicitDataSiIntent(el: HTMLElement | null): boolean {
  const norm = el?.getAttribute("data-si-intent")?.trim().replace(/-/g, "_");
  return Boolean(norm && !GENERIC_DATA_SI_MARKERS.has(norm));
}

/** Header/nav links to high-intent demo routes (Velocity retailer and similar). */
function navCommercialLink(el: Element): HTMLElement | null {
  const link = el.closest<HTMLElement>("nav a[href], header nav a[href]");
  if (!link || link.closest("#si-inspector-root")) return null;
  const href = (link.getAttribute("href") ?? "").toLowerCase();
  if (/\/(test-drive|finance|compare|checkout|cart|apply|demo|contact|schedule)\b/.test(href)) {
    return link;
  }
  const text = (link.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (/\b(test drive|financ|compare|checkout|apply|demo|contact)\b/.test(text)) return link;
  return null;
}

function clickLooksLikeProductTrialExploration(el: Element): boolean {
  const host = el.closest("button, a[href], [role='button']");
  if (!host || host.closest("#si-inspector-root")) return false;
  if (host.closest("footer")) return false;
  if (host.hasAttribute("data-si-intent")) return true;
  const t = (host.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (t.length < 2 || t.length > 100) return false;
  return /\b(try|demo|trial|signal|lab|get started|launch|playground|sandbox|see how|explore the)\b/i.test(t);
}

function appendPathIfNew(p: SessionProfile, pathname: string): void {
  const seq = p.signals.path_sequence;
  const last = seq[seq.length - 1];
  if (last === pathname) return;
  seq.push(pathname);
  if (seq.length > 35) seq.splice(0, seq.length - 35);
}

function seedLanding(p: SessionProfile): void {
  if (!p.signals.landing_href) {
    p.signals.landing_href = window.location.href;
    p.signals.initial_referrer = document.referrer || null;
  }
  if (!p.signals.path_sequence.length) {
    appendPathIfNew(p, window.location.pathname);
  }
}

/**
 * Wire up DOM observers and event listeners. We aim for low-frequency,
 * high-signal events rather than streaming raw telemetry.
 */
export function startObserver(
  getPageType: () => PageType,
  update: Update,
  opts: ObserverOptions = {},
): () => void {
  const start = Date.now();
  let visMark = performance.now();
  let docVisible = !document.hidden;

  const tickDuration = window.setInterval(() => {
    update((p) => {
      seedLanding(p);
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
      seedLanding(p);
      if (pct > p.signals.max_scroll_depth) p.signals.max_scroll_depth = pct;
    });
  }, 400);
  window.addEventListener("scroll", scrollHandler, { passive: true });

  const hoverHandler = throttle((e: Event) => {
    const el = eventTargetElement(e);
    if (!el || el.closest("#si-inspector-root")) return;
    if (!el.closest("main a, main button, header a, header button")) return;
    update((p) => {
      seedLanding(p);
      p.signals.cta_hover_events++;
    });
  }, 900);
  document.addEventListener("mouseover", hoverHandler, { passive: true, capture: true });

  const focusHandler = throttle((e: Event) => {
    const el = eventTargetElement(e);
    if (!el || el.closest("#si-inspector-root")) return;
    if (!el.matches("input, textarea, select") && !el.closest("form input, form textarea, form select")) return;
    update((p) => {
      seedLanding(p);
      p.signals.form_field_focus_events++;
    });
  }, 1200);
  document.addEventListener("focusin", focusHandler, { passive: true, capture: true });

  const submitHandler = (e: Event) => {
    const raw = (e.target as HTMLElement | null)?.closest?.("form");
    if (!raw || !(raw instanceof HTMLFormElement)) return;
    if (raw.closest("#si-inspector-root")) return;

    const form = raw;
    const intent = classifyFormIntent(form);

    update((p) => {
      seedLanding(p);
      if (intent.form_type === "search") {
        p.signals.onsite_search_events++;
      }
      p.commercial_intent = updateCommercialIntentFromForm(p, intent);
      pushIntelEvent(p, buyerSafeFormTimelineLabel(intent.form_type), `form:${intent.form_type}`);
    });
  };
  document.addEventListener("submit", submitHandler, { passive: true, capture: true });

  const visibilityHandler = () => {
    const now = performance.now();
    const delta = Math.max(0, now - visMark);
    visMark = now;
    const wasVisible = docVisible;
    update((p) => {
      seedLanding(p);
      if (wasVisible) p.signals.tab_visible_ms += delta;
      else p.signals.tab_hidden_ms += delta;
    });
    docVisible = !document.hidden;
  };
  document.addEventListener("visibilitychange", visibilityHandler);

  const clickHandler = (e: Event) => {
    const el = eventTargetElement(e);
    if (!el || el.closest("#si-inspector-root")) return;

    const offerHit =
      el.closest(
        "[data-si-price], [data-si-finance], .price, .pricing, [href*='financ'], [href*='lease'], [href*='payment'], [class*='coupon'], [class*='promo'], [class*='calculator']",
      ) || /\b(coupon|promo|apr|lease|financ|estimate payment|payment calculator)\b/i.test(el.textContent ?? "");
    if (offerHit) {
      update((p) => {
        seedLanding(p);
        p.signals.offer_surface_clicks++;
        if (p.signals.offer_surface_clicks === 1) {
          pushIntelEvent(p, "Explored pricing or offer-related content", "offer_surface_first");
        }
      });
    }

    const vertical = opts.getVertical?.();
    const explicitCta = el.closest<HTMLElement>("[data-si-cta], [data-si-intent], button.primary, a.cta");
    const contentInteractive =
      !explicitCta &&
      el.closest<HTMLElement>(
        [
          "main a[href]",
          "main button",
          "article a[href]",
          "article button",
          "[role='main'] a[href]",
          "[role='main'] button",
          "[role='dialog'] a[href]",
          "[role='dialog'] button",
          "[aria-modal='true'] a[href]",
          "[aria-modal='true'] button",
        ].join(", "),
      );
    const trialHost =
      !explicitCta && !contentInteractive && clickLooksLikeProductTrialExploration(el)
        ? el.closest<HTMLElement>("button, a[href], [role='button']")
        : null;
    const navHost = !explicitCta && !contentInteractive && !trialHost ? navCommercialLink(el) : null;
    const ctaHost = explicitCta ?? contentInteractive ?? trialHost ?? navHost;
    const fromTrialHeuristic = Boolean(trialHost && !explicitCta && !contentInteractive);

    if (ctaHost) {
      const interpretation = classifyCtaElement(ctaHost, {
        vertical,
        dataSiCta: ctaHost.getAttribute("data-si-cta"),
        dataSiIntent: ctaHost.getAttribute("data-si-intent"),
      });
      if (interpretation) {
        update((p) => {
          seedLanding(p);
          p.commercial_intent = updateCommercialIntentMemory(p, interpretation);
          const countClick = interpretation.should_count_as_cta_click || fromTrialHeuristic;
          const timelineWorthy =
            interpretation.should_count_as_high_intent ||
            hasExplicitDataSiIntent(ctaHost) ||
            [
              "schedule_test_drive",
              "schedule_demo",
              "talk_to_sales",
              "book_appointment",
              "contact_dealer",
              "begin_checkout",
              "add_to_cart",
              "apply",
              "check_eligibility",
              "view_financing",
              "compare",
            ].includes(interpretation.action.action_family);

          if (countClick) {
            p.signals.cta_clicks++;
          }
          if (timelineWorthy) {
            const dedupe =
              p.signals.cta_clicks <= 1 && countClick
                ? "cta_first_click"
                : `cta:${interpretation.action.action_family}`;
            pushIntelEvent(p, interpretation.timeline_label, dedupe);
          }
          const fam = interpretation.action.action_family;
          if (fam === "view_financing" || fam === "calculate") p.signals.finance_interactions++;
          if (fam === "compare") p.signals.compare_interactions++;
          if (fam === "view_pricing") p.signals.pricing_views++;
        });
      }
    }
    if (el.closest("[data-si-price]")) {
      update((p) => {
        seedLanding(p);
        p.signals.pricing_views++;
      });
    }
    if (el.closest("[data-si-compare-item]")) {
      update((p) => {
        seedLanding(p);
        p.signals.compare_interactions++;
        if (p.signals.compare_interactions === 1) {
          pushIntelEvent(p, "Used compare or shortlist tooling", "compare_first");
        }
      });
    }
    if (el.closest("[data-si-finance]")) {
      update((p) => {
        seedLanding(p);
        p.signals.finance_interactions++;
      });
    }
  };
  document.addEventListener("click", clickHandler, { passive: true, capture: true });

  const formHandler = (e: Event) => {
    const el = eventTargetElement(e);
    if (!el) return;
    if (el.closest("[data-si-finance]")) {
      update((p) => {
        seedLanding(p);
        p.signals.finance_interactions++;
      });
    }
  };
  document.addEventListener("input", throttle(formHandler, 800), { passive: true });

  // Track page view per virtual navigation as well as initial load.
  let lastPath = window.location.pathname;
  const observePage = () => {
    const path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    update((p) => {
      seedLanding(p);
      const t = getPageType();
      p.page_type = t;
      p.signals.pages_viewed++;
      appendPathIfNew(p, window.location.pathname);
      if (t === "vdp") p.signals.vdp_views++;
      if (t === "finance") p.signals.finance_interactions++;
      if (t === "compare") p.signals.compare_interactions++;
    });
  };
  // Initial increment
  update((p) => {
    seedLanding(p);
    p.signals.pages_viewed = Math.max(1, p.signals.pages_viewed + 1);
    appendPathIfNew(p, window.location.pathname);
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
    document.removeEventListener("mouseover", hoverHandler, true);
    document.removeEventListener("focusin", focusHandler, true);
    document.removeEventListener("submit", submitHandler, true);
    document.removeEventListener("visibilitychange", visibilityHandler);
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
