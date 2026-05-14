import type { SiteVertical } from "@si/shared";

/** Public-facing label for `site.site_type` (composite vertical slug). */
export function publicSiteTypeLabel(siteType: string): string {
  const map: Record<string, string> = {
    auto_retail: "Auto retail",
    auto_oem: "Automotive OEM",
    ecommerce: "E-commerce storefront",
    b2b_saas: "B2B SaaS / marketing operating framework",
    b2b_saas_content: "B2B marketing & content site",
    publisher_content: "Publisher / content business",
    publisher_content_content: "Publisher / content site (editorial-led)",
    lead_generation: "Lead generation site",
    lead_generation_content: "Lead generation (content-led)",
    professional_services: "Professional services firm",
    professional_services_content: "Professional services (content-led)",
    nonprofit: "Nonprofit organization",
    nonprofit_content: "Nonprofit (content-led)",
    unknown: "General business site",
    unknown_content: "Content-led business site",
    ecommerce_content: "E-commerce (content-led)",
    general_business: "General business site",
    general_business_content: "General business (content-led)",
    content_led_business: "Content-led business site",
    content_led_business_content: "Content-led business (editorial)",
    healthcare: "Healthcare organization",
    healthcare_content: "Healthcare (content-led)",
    financial_services: "Financial services site",
    financial_services_content: "Financial services (content-led)",
    education: "Education institution",
    education_content: "Education (content-led)",
    travel_hospitality: "Travel & hospitality",
    travel_hospitality_content: "Travel & hospitality (content-led)",
    real_estate: "Real estate",
    real_estate_content: "Real estate (content-led)",
    home_services: "Home services",
    home_services_content: "Home services (content-led)",
    local_services: "Local services",
    local_services_content: "Local services (content-led)",
  };
  return map[siteType] ?? siteType.replace(/_/g, " ");
}

export function audienceForVertical(vertical: SiteVertical): string {
  switch (vertical) {
    case "b2b_saas":
    case "lead_generation":
      return "Marketing leaders, operators, and team leads evaluating frameworks and execution.";
    case "ecommerce":
      return "Shoppers comparing products, pricing, and checkout paths.";
    case "publisher_content":
    case "content_led_business":
      return "Readers and subscribers building topic familiarity.";
    case "professional_services":
      return "Buyers researching credibility, outcomes, and fit before contacting the firm.";
    case "nonprofit":
      return "Supporters exploring impact, events, and ways to contribute.";
    case "auto_retail":
    case "auto_oem":
      return "Vehicle shoppers comparing inventory, payments, and next steps.";
    case "healthcare":
      return "Patients and caregivers evaluating care options, locations, and next steps.";
    case "financial_services":
      return "Consumers or businesses comparing rates, products, and trust signals.";
    case "education":
      return "Students, parents, or professionals evaluating programs and admissions paths.";
    case "travel_hospitality":
      return "Travelers comparing stays, destinations, and booking convenience.";
    case "real_estate":
      return "Buyers and renters evaluating listings, neighborhoods, and agents.";
    case "home_services":
    case "local_services":
      return "Local customers comparing providers, availability, and quotes.";
    default:
      return "Business visitors exploring positioning, proof, and next actions.";
  }
}

/** Human-readable page classifier evidence lines for CMO copy. */
export function humanizePageSignals(signals: string[]): string[] {
  const m: Record<string, string> = {
    "auto page_type home": "Homepage structure detected",
    "checkout URL": "Checkout flow URL matched",
    "cart URL": "Shopping cart URL matched",
    "search URL/query": "Search results pattern",
    "JSON-LD Product": "Product schema detected",
    "JSON-LD Article": "Article schema detected",
    "content URL segment": "Editorial or insights URL pattern",
    "pricing path/title": "Pricing or plans signals",
    "contact/demo language": "Contact or demo intent language",
    "support/docs URL": "Help or documentation URL",
    "account/settings URL": "Account or settings area",
    "many product-like links": "Product browsing pattern",
    "root path": "Landing / root path",
    "auto inventory/VDP routing": "Inventory or vehicle detail routing",
    "insufficient page-specific cues": "Few page-specific structural cues",
  };
  return signals.map((s) => {
    const form = /^form fields \((\d+)\)$/.exec(s);
    if (form) return `Multi-field form detected (${form[1]} fields)`;
    return m[s] ?? s.replace(/_/g, " ");
  });
}
