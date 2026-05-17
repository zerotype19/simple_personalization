import type { CommercialActionInterpretation, SiteVertical } from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";

const FAMILY_LABELS: Record<string, string> = {
  learn_more: "Explored product or feature details",
  explore: "Browsed catalog or inventory",
  compare: "Compared options",
  view_pricing: "Explored pricing or plan details",
  calculate: "Used a calculator or estimator",
  check_eligibility: "Checked eligibility or availability",
  read_reviews: "Reviewed trust or social proof",
  start_trial: "Started a trial or demo path",
  get_started: "Moved toward getting started",
  add_to_cart: "Moved toward purchase",
  begin_checkout: "Continued toward checkout",
  continue_application: "Continued an application or checkout path",
  request_quote: "Requested pricing or a quote",
  schedule_demo: "Moved toward scheduling a demo or consultation",
  talk_to_sales: "Moved toward human contact",
  schedule_test_drive: "Moved toward an in-person test drive",
  book_appointment: "Booked or requested an appointment",
  contact_dealer: "Sought dealer or location contact",
  view_financing: "Engaged with financing or payment guidance",
  view_security: "Reviewed trust or security details",
  view_returns: "Reviewed shipping, returns, or warranty details",
  view_faq: "Reviewed help or FAQ content",
  save_for_later: "Saved an item for later consideration",
  configure: "Configured or built a package",
  apply: "Moved toward an application",
};

export function buyerSafeTimelineLabel(
  action: CommercialActionInterpretation,
  vertical?: SiteVertical,
): string {
  if (isAutoSiteVertical(vertical ?? "unknown") && action.action_family === "schedule_demo") {
    const blob = `${action.matched_phrase} ${(action.evidence ?? []).join(" ")}`.toLowerCase();
    if (/test[\s-]?drive|testdrive|data_si_intent/.test(blob)) {
      return FAMILY_LABELS.schedule_test_drive;
    }
    return "Moved toward scheduling or an in-person visit";
  }
  return FAMILY_LABELS[action.action_family] ?? "Took a meaningful commercial step on the page";
}
