import type { SiteVertical } from "@si/shared";
import type { CtaElementInterpretation, CtaElementRole } from "@si/shared";
import { classifyCommercialAction } from "./classifyCommercialAction";
import { buyerSafeTimelineLabel } from "./timelineLabels";

function visibleText(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function inferElementRole(el: HTMLElement): CtaElementRole {
  if (el.closest("header, nav, [role='navigation']")) return "header_nav";
  if (el.closest("[role='dialog'], [aria-modal='true'], .modal")) return "modal";
  if (el.closest("footer")) return "footer";
  if (el.closest("form")) return "form_submit";
  if (el.closest("[class*='pricing'], [data-si-price], section[id*='pricing']")) return "pricing_section";
  if (el.closest("[class*='product'], [data-si-compare-item], .product-card, article")) return "product_card";
  if (el.closest("section.hero, .hero, [class*='hero']")) return "hero";
  if (el.closest("main, article, [role='main']")) return "inline_content";
  return "unknown";
}

function isHighIntent(actionFamily: string): boolean {
  return [
    "schedule_demo",
    "schedule_test_drive",
    "talk_to_sales",
    "book_appointment",
    "contact_dealer",
    "begin_checkout",
    "add_to_cart",
    "apply",
    "continue_application",
    "request_quote",
    "start_trial",
    "calculate",
    "check_eligibility",
  ].includes(actionFamily);
}

function isHumanEscalation(actionFamily: string): boolean {
  return [
    "schedule_demo",
    "schedule_test_drive",
    "talk_to_sales",
    "book_appointment",
    "contact_dealer",
  ].includes(actionFamily);
}

export function classifyCtaElement(
  el: Element,
  opts?: { vertical?: SiteVertical; dataSiCta?: string | null; dataSiIntent?: string | null },
): CtaElementInterpretation | null {
  const host =
    (el instanceof HTMLElement ? el : el.parentElement)?.closest<HTMLElement>(
      "button, a[href], [role='button'], input[type='submit'], input[type='button']",
    ) ?? null;
  if (!host) return null;

  const text = visibleText(host);
  const aria = host.getAttribute("aria-label") ?? undefined;
  const title = host.getAttribute("title") ?? undefined;
  const href = host instanceof HTMLAnchorElement ? host.href : host.getAttribute("href") ?? undefined;

  let action = classifyCommercialAction({
    text: opts?.dataSiIntent?.replace(/_/g, " ") || opts?.dataSiCta?.replace(/_/g, " ") || text,
    href: href ?? undefined,
    ariaLabel: aria,
    title,
    vertical: opts?.vertical,
  });

  if (opts?.dataSiCta === "finance") action = { ...action, action_family: "view_financing", evidence: [...action.evidence, "data_si_cta_finance"] };
  if (opts?.dataSiCta === "compare") action = { ...action, action_family: "compare", evidence: [...action.evidence, "data_si_cta_compare"] };

  const element_role = inferElementRole(host);
  const is_repeated_chrome_cta = element_role === "header_nav" || element_role === "footer";
  const is_primary_visual_cta = element_role === "hero" || element_role === "pricing_section";

  const lowChromeLearn =
    is_repeated_chrome_cta &&
    (action.action_family === "learn_more" ||
      action.intent_strength === "passive" ||
      action.intent_strength === "low");

  const should_count_as_cta_click =
    !lowChromeLearn && action.confidence >= 0.45 && element_role !== "footer";
  const should_count_as_high_intent =
    should_count_as_cta_click &&
    (isHighIntent(action.action_family) ||
      (is_primary_visual_cta && action.intent_strength !== "passive" && action.intent_strength !== "low"));

  if (element_role === "footer" && action.friction_level === "low") {
    action = { ...action, intent_strength: "low", confidence: Math.min(action.confidence, 0.55) };
  }

  return {
    action,
    element_role,
    is_primary_visual_cta,
    is_repeated_chrome_cta,
    should_count_as_cta_click,
    should_count_as_high_intent,
    timeline_label: buyerSafeTimelineLabel(action),
  };
}
