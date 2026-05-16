import type { GenericPageKind, PageType, SiteScanSummary } from "@si/shared";

function formFieldCount(): number {
  if (typeof document === "undefined") return 0;
  let n = 0;
  document.querySelectorAll("form input, form select, form textarea").forEach((el, i) => {
    if (i > 120) return;
    const t = (el as HTMLInputElement).type;
    if (t === "hidden" || t === "submit") return;
    n++;
  });
  return n;
}

function productishLinkDensity(): number {
  if (typeof document === "undefined") return 0;
  let hits = 0;
  let total = 0;
  document.querySelectorAll("main a[href], article a[href]").forEach((el, i) => {
    if (i > 200) return;
    total++;
    const h = (el as HTMLAnchorElement).href.toLowerCase();
    if (/\/(product|products|shop|item|p)\b/i.test(h) || /[?&]add-to-cart=/i.test(h)) hits++;
  });
  return total > 0 ? hits / total : 0;
}

/**
 * Rules-first generic page kind + confidence (0–1) + short signal labels for the inspector.
 */
export function classifyGenericPage(
  pathname: string,
  scan: SiteScanSummary,
  pageType: PageType,
  jsonLdTypes: string[],
): { generic_kind: GenericPageKind; confidence: number; signals_used: string[] } {
  const signals_used: string[] = [];
  const p = pathname.toLowerCase();
  const title = scan.page_title.toLowerCase();
  const blob = `${p} ${title} ${scan.top_terms.slice(0, 12).join(" ")}`;

  const has = (rx: RegExp, label: string) => {
    if (rx.test(blob)) {
      signals_used.push(label);
      return true;
    }
    return false;
  };

  if (pageType === "home" && (p === "/" || p === "")) {
    signals_used.push("auto page_type home");
    return { generic_kind: "homepage", confidence: 0.78, signals_used };
  }

  if (/\/(checkout|place-order|thank-you|order-complete)\b/i.test(p)) {
    signals_used.push("checkout URL");
    return { generic_kind: "checkout_page", confidence: 0.86, signals_used };
  }
  if (/\/(cart|bag|basket)\b/i.test(p)) {
    signals_used.push("cart URL");
    return { generic_kind: "cart_page", confidence: 0.84, signals_used };
  }

  if (has(/\/(search|find)\b|[?&]q=|[?&]query=/i, "search URL/query")) {
    return { generic_kind: "search_results_page", confidence: 0.72, signals_used };
  }

  if (jsonLdTypes.some((t) => /product/i.test(t))) {
    signals_used.push("JSON-LD Product");
    return { generic_kind: "product_detail_page", confidence: 0.82, signals_used };
  }

  if (
    jsonLdTypes.some((t) => /article|newsarticle|blogposting/i.test(t)) ||
    /\/(blog|posts?|articles?|news|insights|stories)\b/i.test(p)
  ) {
    if (jsonLdTypes.some((t) => /article|newsarticle|blogposting/i.test(t))) signals_used.push("JSON-LD Article");
    if (/\/(blog|posts?|articles?|news|insights)\b/i.test(p)) signals_used.push("content URL segment");
    return { generic_kind: "article_page", confidence: 0.76, signals_used };
  }

  if (/\/(pricing|plans?|billing)\b/i.test(p) || /\b(pricing|plans?|subscribe)\b/i.test(title)) {
    signals_used.push("pricing path/title");
    return { generic_kind: "pricing_page", confidence: 0.74, signals_used };
  }

  const fc = formFieldCount();
  if (
    fc >= 4 &&
    /\b(contact|request|demo|quote|consultation|get in touch|talk to us)\b/i.test(blob)
  ) {
    signals_used.push(`form fields (${fc})`);
    signals_used.push("contact/demo language");
    return { generic_kind: "lead_form_page", confidence: 0.7, signals_used };
  }

  if (/\/(support|help|docs|documentation|kb)\b/i.test(p)) {
    signals_used.push("support/docs URL");
    return { generic_kind: "support_page", confidence: 0.68, signals_used };
  }

  if (/\/(account|profile|settings|dashboard)\b/i.test(p)) {
    signals_used.push("account/settings URL");
    return { generic_kind: "account_page", confidence: 0.65, signals_used };
  }

  const density = productishLinkDensity();
  if (density >= 0.22) {
    signals_used.push("many product-like links");
    return { generic_kind: "category_page", confidence: 0.66, signals_used };
  }

  if (p === "/" || p === "") {
    signals_used.push("root path");
    return { generic_kind: "homepage", confidence: 0.58, signals_used };
  }

  if (pageType === "vdp" || pageType === "inventory") {
    signals_used.push("auto inventory/VDP routing");
    return { generic_kind: "product_detail_page", confidence: 0.8, signals_used };
  }

  return { generic_kind: "unknown", confidence: 0.42, signals_used: ["insufficient page-specific cues"] };
}

export function humanGenericPageLabel(kind: GenericPageKind): string {
  const map: Record<GenericPageKind, string> = {
    homepage: "Homepage",
    category_page: "Category / listing",
    product_detail_page: "Product detail",
    article_page: "Long-form editorial content",
    pricing_page: "Pricing / plans",
    lead_form_page: "Lead / contact",
    cart_page: "Cart",
    checkout_page: "Checkout",
    account_page: "Account / app",
    search_results_page: "Search results",
    support_page: "Support / docs",
    unknown: "Content page",
  };
  return map[kind as keyof typeof map] ?? "Content page";
}

/**
 * Inspector / timeline copy: never “Unknown page”; use path hints when the classifier is weak.
 */
export function timelineHumanPageLabel(kind: GenericPageKind, pathname: string): string {
  const raw = (pathname.split("?")[0] || "/").trim() || "/";
  const p = raw.toLowerCase();

  const treatAsUnknownHints = (): string => {
    if (/\bchapter\b|\/chapter\d*\/|\/chapters?\//i.test(p)) return "Chapter page";
    if (/\b(part|volume|book|series|framework)\b/i.test(p)) return "Framework or series page";
    if (/\/(blog|posts?|articles?|news|insights|editorial)\b/i.test(p)) return "Editorial content page";
    if (/\/(manifesto|guide|playbook|handbook)\b/i.test(p)) return "Guide or manifesto page";
    if (/\/(pricing|plans|subscribe|membership)\b/i.test(p)) return "Plans or subscription page";
    if (/\/(compare)\b/i.test(p)) return "Compare or shortlist page";
    if (/\/(finance|financing|payment|calculator)\b/i.test(p)) return "Financing or payment page";
    if (/\/(test-?drive|testdrive)\b/i.test(p)) return "Test drive or appointment page";
    if (/\/(inventory|vehicles|catalog)\b/i.test(p)) return "Inventory listing page";
    if (/\/(about|team|company|careers)\b/i.test(p)) return "About or company page";
    if (/\/(dive|learn|explore|start)\b/i.test(p)) return "Learning or onboarding page";
    // Single marketing slug path (e.g. /the-rhythmic-marketer) — still editorial-shaped.
    if (/^\/[a-z0-9][-a-z0-9]+\/?$/i.test(raw) && raw !== "/") return "Article or story page";
    if (p !== "/" && p.length > 1) return "Content page";
    return "Content page";
  };

  if (kind === "unknown") {
    return treatAsUnknownHints();
  }

  return humanGenericPageLabel(kind);
}
