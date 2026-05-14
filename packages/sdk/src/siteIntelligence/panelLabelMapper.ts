import { isAutoSiteVertical, type SiteVertical } from "@si/shared";

const VERTICAL_LABELS: Record<SiteVertical, string> = {
  auto_retail: "Auto retail",
  auto_oem: "Auto OEM",
  ecommerce: "E-commerce",
  b2b_saas: "B2B SaaS / product marketing",
  publisher_content: "Publisher / content",
  lead_generation: "Lead generation",
  professional_services: "Professional services",
  nonprofit: "Nonprofit",
  unknown: "Unknown / generic",
  general_business: "General business",
  content_led_business: "Content-led business",
  healthcare: "Healthcare",
  financial_services: "Financial services",
  education: "Education",
  travel_hospitality: "Travel & hospitality",
  real_estate: "Real estate",
  home_services: "Home services",
  local_services: "Local services",
};

export function verticalDisplayName(v: SiteVertical): string {
  return VERTICAL_LABELS[v] ?? v;
}

export function liveSignalSectionTitle(vertical: SiteVertical): string {
  if (isAutoSiteVertical(vertical)) return "Live signals (retail)";
  return "Live signals";
}

export function topicAffinitySectionTitle(vertical: SiteVertical): string {
  if (isAutoSiteVertical(vertical)) return "Category affinity";
  return "Business concepts";
}

export function siteContextTitle(): string {
  return "Site context";
}
