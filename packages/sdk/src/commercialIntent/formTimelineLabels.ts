import type { FormIntentType } from "@si/shared";

const FORM_TIMELINE: Record<FormIntentType, string> = {
  lead: "Submitted a lead or contact form",
  newsletter: "Signed up for updates or a newsletter",
  search: "Submitted a search",
  checkout: "Moved toward checkout",
  application: "Moved into an application flow",
  quote: "Requested a quote or pricing follow-up",
  appointment: "Moved toward scheduling or an in-person visit",
  eligibility: "Requested eligibility or coverage guidance",
  login: "Signed in or opened an account path",
  support: "Submitted a support or help request",
  unknown: "Submitted a form on the page",
};

export function buyerSafeFormTimelineLabel(formType: FormIntentType): string {
  return FORM_TIMELINE[formType] ?? FORM_TIMELINE.unknown;
}
