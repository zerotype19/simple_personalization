import type { SiteScanSummary, SiteVertical } from "@si/shared";
import { classifyVertical } from "./siteIntelligence/verticalClassifier";

const SITE_VERTICAL_VALUES: readonly SiteVertical[] = [
  "auto_retail",
  "auto_oem",
  "ecommerce",
  "b2b_saas",
  "publisher_content",
  "lead_generation",
  "professional_services",
  "nonprofit",
  "unknown",
  "general_business",
  "content_led_business",
  "healthcare",
  "financial_services",
  "education",
  "travel_hospitality",
  "real_estate",
  "home_services",
  "local_services",
] as const;

const SITE_VERTICAL_SET = new Set<string>(SITE_VERTICAL_VALUES);

const VERTICAL_ALIASES: Record<string, SiteVertical> = {
  auto: "auto_retail",
  automotive: "auto_retail",
  auto_retail: "auto_retail",
  "auto-retail": "auto_retail",
  auto_oem: "auto_oem",
  "auto-oem": "auto_oem",
  b2b: "b2b_saas",
  saas: "b2b_saas",
  b2b_saas: "b2b_saas",
  "b2b-saas": "b2b_saas",
};

/** Parse `data-si-vertical` / boot override (explicit publisher config, not inferred). */
export function parseSiteVerticalOverride(raw: string | null | undefined): SiteVertical | undefined {
  const token = raw?.trim().toLowerCase();
  if (!token) return undefined;
  const normalized = token.replace(/-/g, "_");
  const resolved = VERTICAL_ALIASES[normalized] ?? VERTICAL_ALIASES[token] ?? normalized;
  if (SITE_VERTICAL_SET.has(resolved)) return resolved as SiteVertical;
  return undefined;
}

/** Classifier unless an explicit vertical override is configured (demo / publisher). */
export function resolveSiteVertical(
  scan: SiteScanSummary,
  pathname: string,
  override?: SiteVertical,
): { vertical: SiteVertical; confidence: number } {
  if (override) return { vertical: override, confidence: 100 };
  return classifyVertical(scan, pathname);
}
