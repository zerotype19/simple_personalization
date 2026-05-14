import type { SiteVertical } from "@si/shared";

/** Dynamic “force persona” archetypes by inferred vertical (not auto-dealer labels off-retail). */
export function archetypePersonasForVertical(v: SiteVertical): string[] {
  switch (v) {
    case "auto_retail":
    case "auto_oem":
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
    case "healthcare":
      return ["patient_researcher", "caregiver", "appointment_seeker", "comparison_shopper", "local_seeker"];
    case "financial_services":
      return ["rate_shopper", "applicant", "advisor_seeker", "trust_sensitive", "return_visitor"];
    case "education":
      return ["student_prospect", "parent_researcher", "program_comparer", "scholarship_seeker", "return_visitor"];
    case "travel_hospitality":
      return ["trip_planner", "deal_seeker", "loyal_guest", "last_minute_booker", "experience_seeker"];
    case "real_estate":
      return ["buyer", "renter", "neighborhood_researcher", "investor", "first_time_buyer"];
    case "home_services":
    case "local_services":
      return ["urgent_need", "price_comparer", "trust_seeker", "appointment_planner", "repeat_customer"];
    default:
      return ["curious_visitor", "researcher", "comparison_shopper", "returning_explorer", "high_intent_visitor"];
  }
}
