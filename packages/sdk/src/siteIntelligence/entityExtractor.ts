import type { SiteScanSummary } from "@si/shared";

/** Prefer structured / short signals over scraping full DOM again. */
export function siteNameFromScan(scan: SiteScanSummary): string | null {
  return scan.site_name;
}
