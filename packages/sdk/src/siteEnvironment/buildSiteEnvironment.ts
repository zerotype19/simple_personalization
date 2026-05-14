import type { PageType, SiteEnvironmentSnapshot, SiteScanSummary, SiteVertical } from "@si/shared";
import { humanizePageSignals } from "../siteIntelligence/publicLabels";
import { buildConfidenceLadder } from "./confidenceLadder";
import { inferConversionObjectives } from "./conversionInference";
import {
  classifyGenericPage,
} from "./genericPageClassifier";
import { collectJsonLdTypes } from "./jsonLdTypes";
import { inferPageObject } from "./pageObjectHint";
import { buildSiteFingerprint } from "./siteFingerprint";

export interface BuildSiteEnvironmentInput {
  pathname: string;
  scan: SiteScanSummary;
  vertical: SiteVertical;
  verticalConfidencePct: number;
  pageType: PageType;
}

export function buildSiteEnvironment(input: BuildSiteEnvironmentInput): SiteEnvironmentSnapshot {
  const jsonLdTypes = collectJsonLdTypes();
  const pageRaw = classifyGenericPage(input.pathname, input.scan, input.pageType, jsonLdTypes);
  const page = { ...pageRaw, signals_used: humanizePageSignals(pageRaw.signals_used) };
  const site = buildSiteFingerprint(
    input.scan,
    input.vertical,
    input.verticalConfidencePct,
    page.generic_kind,
  );
  const conversion = inferConversionObjectives(
    input.vertical,
    page.generic_kind,
    input.scan,
    input.pathname,
  );
  const object = inferPageObject(input.vertical, page.generic_kind, input.scan);

  const ladder = buildConfidenceLadder(site.confidence, page.confidence, conversion.confidence);

  return { site, page, object, conversion, ladder };
}

export { humanGenericPageLabel, timelineHumanPageLabel } from "./genericPageClassifier";
