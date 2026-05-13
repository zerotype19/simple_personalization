import type { PageType, SiteScanSummary } from "@si/shared";

/**
 * Human-readable page archetype for the inspector (orthogonal to auto `PageType`).
 */
export function classifyPageKind(
  pathname: string,
  scan: SiteScanSummary,
  pageType: PageType,
): string {
  if (pageType !== "other") {
    const map: Partial<Record<PageType, string>> = {
      home: "Marketing home",
      inventory: "Inventory listing",
      vdp: "Vehicle detail",
      finance: "Finance flow",
      compare: "Comparison",
      trade_in: "Trade-in",
      test_drive: "Test drive / schedule",
    };
    return map[pageType] ?? pageType;
  }
  const p = pathname.toLowerCase();
  if (/\/(blog|posts?|articles?|news|insights)\b/i.test(p)) return "Article / content";
  if (/\/(pricing|plans?)\b/i.test(p)) return "Pricing / plans";
  if (/\/(login|sign-?in|auth)\b/i.test(p)) return "Sign-in";
  if (p === "/" || p === "") return "Home / landing";

  const t = scan.page_title.toLowerCase();
  if (/\b(blog|article|guide|insights)\b/.test(t)) return "Article / content";
  if (/\b(pricing|plan|trial)\b/.test(t)) return "Commercial intent page";

  return "Content / app page";
}
