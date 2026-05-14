import type { SiteVertical } from "@si/shared";

/** Public-facing label for `site.site_type` (composite vertical slug). */
export function publicSiteTypeLabel(siteType: string): string {
  const map: Record<string, string> = {
    auto_retail: "Auto retail",
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
      return "Readers and subscribers building topic familiarity.";
    case "professional_services":
      return "Buyers researching credibility, outcomes, and fit before contacting the firm.";
    case "nonprofit":
      return "Supporters exploring impact, events, and ways to contribute.";
    case "auto_retail":
      return "Vehicle shoppers comparing inventory, payments, and next steps.";
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
