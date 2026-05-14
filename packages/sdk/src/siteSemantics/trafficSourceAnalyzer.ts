import type { TrafficAcquisitionRead, TrafficChannelGuess } from "@si/shared";

const CLICK_IDS = ["gclid", "fbclid", "msclkid", "ttclid", "li_fat_id", "wbraid", "gbraid"] as const;

function norm(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t.length > 200) return t.slice(0, 200);
  return t;
}

/**
 * First-party URL + referrer read for acquisition intelligence (no third-party cookies).
 */
export function analyzeTrafficAcquisition(href: string, documentReferrer: string | null): TrafficAcquisitionRead {
  let url: URL;
  try {
    url = new URL(href, "https://placeholder.local");
  } catch {
    return {
      channel_guess: "direct_or_unknown",
      landing_path: "/",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      has_click_id: false,
    };
  }

  const sp = url.searchParams;
  const utm_source = norm(sp.get("utm_source"));
  const utm_medium = norm(sp.get("utm_medium"));
  const utm_campaign = norm(sp.get("utm_campaign"));
  const utm_term = norm(sp.get("utm_term"));
  const utm_content = norm(sp.get("utm_content"));

  let has_click_id = false;
  for (const k of CLICK_IDS) {
    if (sp.get(k)) {
      has_click_id = true;
      break;
    }
  }

  const ms = (utm_medium ?? "").toLowerCase();
  const src = (utm_source ?? "").toLowerCase();

  let channel_guess: TrafficChannelGuess = "direct_or_unknown";

  if (has_click_id) {
    if (/cpc|ppc|paidsearch|search/i.test(ms) || src === "google") channel_guess = "paid_search";
    else if (/paid|social|paidsocial|social/i.test(ms) || /facebook|instagram|tiktok|linkedin|twitter|x\.com/i.test(src))
      channel_guess = "paid_social";
    else channel_guess = "display_or_programmatic";
  } else if (utm_medium || utm_source) {
    if (/cpc|ppc|paidsearch|paid-search|paid_search/i.test(ms)) channel_guess = "paid_search";
    else if (/paidsocial|paid-social|paid_social/i.test(ms)) channel_guess = "paid_social";
    else if (/cpm|display|programmatic|banner/i.test(ms)) channel_guess = "display_or_programmatic";
    else if (/email|newsletter|crm|nurture/i.test(ms)) channel_guess = "email_or_crm";
    else if (/affiliate|partner/i.test(ms)) channel_guess = "affiliate_or_partner";
    else if (
      (/organic|seo/i.test(ms) || ms === "organic") &&
      /(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia)\b/i.test(src)
    )
      channel_guess = "organic_search";
    else if (
      /social|social-network|social_network|community/i.test(ms) ||
      /facebook|instagram|tiktok|linkedin|twitter|t\.co|reddit|youtube|pinterest/i.test(src)
    )
      channel_guess = "organic_social";
    else if (/organic|seo|search/i.test(ms)) channel_guess = "organic_search";
    else if (/referral|web|site/i.test(ms)) channel_guess = "referral";
    else channel_guess = "referral";
  } else if (documentReferrer && documentReferrer.length > 0) {
    channel_guess = "referral";
  }

  return {
    channel_guess,
    landing_path: `${url.pathname}${url.search}`.slice(0, 500),
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    has_click_id,
  };
}
