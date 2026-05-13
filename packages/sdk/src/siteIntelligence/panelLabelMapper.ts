import type { SiteVertical } from "@si/shared";

const VERTICAL_LABELS: Record<SiteVertical, string> = {
  auto_retail: "Auto retail",
  ecommerce: "E-commerce",
  b2b_saas: "B2B SaaS / product marketing",
  publisher_content: "Publisher / content",
  lead_generation: "Lead generation",
  professional_services: "Professional services",
  nonprofit: "Nonprofit",
  unknown: "Unknown / generic",
};

export function verticalDisplayName(v: SiteVertical): string {
  return VERTICAL_LABELS[v] ?? v;
}

export function liveSignalSectionTitle(vertical: SiteVertical): string {
  if (vertical === "auto_retail") return "Live signals (retail)";
  return "Live signals";
}

export function topicAffinitySectionTitle(vertical: SiteVertical): string {
  if (vertical === "auto_retail") return "Category affinity";
  return "Topic affinity";
}

export function siteContextTitle(): string {
  return "Site context";
}
