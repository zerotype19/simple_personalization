import type { SiteEnvironmentSnapshot } from "@si/shared";

export function emptySiteEnvironmentSnapshot(): SiteEnvironmentSnapshot {
  return {
    site: {
      domain: "",
      site_type: "unknown",
      confidence: 0,
      primary_topics: [],
      detected_ctas: [],
      likely_objective: "unknown",
      platform_guess: "unknown",
    },
    page: {
      generic_kind: "unknown",
      confidence: 0,
      signals_used: [],
    },
    object: {
      object_type: "unknown",
      object_name: null,
      category: null,
      topic_cluster: null,
    },
    conversion: {
      primary_objective: "unknown",
      secondary_objective: null,
      detected_elements: [],
      confidence: 0,
    },
    ladder: {
      level: 1,
      label: "Observe only",
      detail: "Not enough signals yet — learning this site.",
    },
  };
}
