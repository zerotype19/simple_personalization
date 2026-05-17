export interface RecommendedExperienceCard {
  surfaceId: string;
  name: string;
  whyItAppears: string;
  whenItAppears: string;
  whyWithheld: string;
}

export const RECOMMENDED_EXPERIENCES: RecommendedExperienceCard[] = [
  {
    surfaceId: "finance_payment_assist",
    name: "Payment reassurance",
    whyItAppears: "Visitors comparing financing often need reassurance before escalation.",
    whenItAppears: "After sustained financing exploration.",
    whyWithheld: "The visitor has not shown enough escalation intent yet.",
  },
  {
    surfaceId: "inventory_assist_module",
    name: "Inventory reassurance",
    whyItAppears: "Browsing availability without a clear next step can benefit from light guidance.",
    whenItAppears: "During early inventory exploration.",
    whyWithheld: "When comparison or financing intent already warrants a stronger primary.",
  },
  {
    surfaceId: "test_drive_secondary_cta",
    name: "Test-drive soft prompt",
    whyItAppears: "In-person scheduling fits when human-contact intent is clear.",
    whenItAppears: "After comparison and financing depth, with sufficient readiness.",
    whyWithheld: "When financing uncertainty or hesitation still suggests reassurance first.",
  },
];
