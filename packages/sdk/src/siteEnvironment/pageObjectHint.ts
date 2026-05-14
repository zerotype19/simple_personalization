import type { GenericPageKind, SiteScanSummary, SiteVertical } from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";
import { normalizeReadableText } from "../siteSemantics/normalizeText";

function firstH1(): string | null {
  if (typeof document === "undefined") return null;
  const h = document.querySelector("h1");
  const t = h?.textContent?.trim();
  return t && t.length < 200 ? t : null;
}

function objectDisplayName(h1: string | null, pageTitle: string): string | null {
  const a = normalizeReadableText(h1 ?? "");
  if (a) return a;
  const b = normalizeReadableText(pageTitle);
  return b || null;
}

export function inferPageObject(
  vertical: SiteVertical,
  genericKind: GenericPageKind,
  scan: SiteScanSummary,
): {
  object_type: string;
  object_name: string | null;
  category: string | null;
  topic_cluster: string | null;
} {
  const h1 = firstH1();
  const topic = scan.content_themes[0] ?? scan.top_terms[0] ?? null;

  if (isAutoSiteVertical(vertical)) {
    return {
      object_type: "vehicle",
      object_name: objectDisplayName(h1, scan.page_title),
      category: scan.top_terms.find((w) => /suv|sedan|truck|ev|hybrid/i.test(w)) ?? null,
      topic_cluster: topic,
    };
  }

  if (vertical === "ecommerce" && genericKind === "product_detail_page") {
    return {
      object_type: "product",
      object_name: objectDisplayName(h1, scan.page_title),
      category: scan.top_terms[1] ?? null,
      topic_cluster: topic,
    };
  }

  if (genericKind === "article_page") {
    return {
      object_type: "content_article",
      object_name: objectDisplayName(h1, scan.page_title),
      category: scan.content_themes[0] ?? null,
      topic_cluster: scan.content_themes.slice(0, 2).join(" · ") || topic || null,
    };
  }

  return {
    object_type: "page",
    object_name: objectDisplayName(h1, scan.page_title),
    category: scan.content_themes[0] ?? null,
    topic_cluster: topic,
  };
}
