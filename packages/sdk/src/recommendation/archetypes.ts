import type { SiteVertical } from "@si/shared";

/** Dynamic “force persona” archetypes by inferred vertical (not auto-dealer labels off-retail). */
export function archetypePersonasForVertical(v: SiteVertical): string[] {
  switch (v) {
    case "auto_retail":
      return ["researcher", "family_buyer", "luxury_buyer", "payment_sensitive", "high_intent"];
    case "ecommerce":
      return ["browser", "category_explorer", "product_comparer", "deal_seeker", "cart_ready_shopper"];
    case "publisher_content":
      return ["casual_reader", "deep_reader", "topic_loyalist", "newsletter_prospect", "returning_fan"];
    case "professional_services":
      return ["service_researcher", "case_study_reader", "consultation_ready", "comparison_shopper", "high_intent_lead"];
    case "b2b_saas":
    case "lead_generation":
      return [
        "strategic_researcher",
        "implementation_evaluator",
        "economic_buyer",
        "team_leader",
        "high_intent_lead",
      ];
    case "nonprofit":
      return ["cause_explorer", "volunteer_prospect", "donor_ready", "event_interested", "recurring_supporter"];
    default:
      return [
        "strategic_researcher",
        "implementation_evaluator",
        "economic_buyer",
        "content_explorer",
        "high_intent_visitor",
      ];
  }
}
