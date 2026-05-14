import type { SiteScanSummary, SiteVertical } from "@si/shared";

function score(text: string, patterns: RegExp[]): number {
  let s = 0;
  for (const p of patterns) {
    if (p.test(text)) s += 1;
  }
  return s;
}

function countSignalHits(haystack: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    if (p.test(haystack)) n += 1;
  }
  return n;
}

/** Broad automotive interest (OEM brand sites + dealer sites). */
function automotiveBroadHit(path: string, blob: string): boolean {
  const vehicleCue =
    /\b(vehicle|vehicles|car|cars|truck|trucks|suv|crossover|\bvin\b|dealership|dealers?|msrp|trim|test\s*drive|vdp|carfax|sedan|coupe|wagon|hybrid\s+vehicle|\boem\b)\b/i;
  const pathAuto =
    /(vdp|\/vehicles|\/inventory\/|\/cars|\/trucks|\/new-vehicles|\/used-vehicles|\/certified|test-drive|\/auto\/|\/inventory\.)/i;
  return vehicleCue.test(blob) || pathAuto.test(path);
}

/** OEM / brand-site style cues (build & price, configure, owner, shopping tools). */
const OEM_AUTO_SIGNALS: RegExp[] = [
  /\bbuild\s*(?:and|&)?\s*price\b|build[\s-]your\b/i,
  /\bconfigurator\b|\bconfigure\b|\bconfiguration\b/i,
  /\b(?:locate|find)\s+(?:a\s+)?dealer\b|\bdealer\s+locator\b/i,
  /\bowner'?s?\s+(?:resources|portal|manual|support|info)\b/i,
  /shopping-tools|\/build[\-/]|build-and-price/i,
  /\b(?:trims?|lineup)\b/i,
  /\b(?:incentives?|current\s+offers?|special\s+offers?)\b/i,
  /\/models?(?:\/|$)|\/trims?(?:\/|$)/i,
];

/** Dealership / local retail lot cues (inventory, VIN, trade-in, test drive). */
const RETAIL_AUTO_SIGNALS: RegExp[] = [
  /\bdealership\b/i,
  /\bused\s+cars?\b|\bpre[\s-]?owned\b|\bcertified\s+pre[\s-]?owned\b/i,
  /\bstock\s*(?:#|no\.?|number)\b/i,
  /\bvin\b/i,
  /\btrade[\s-]?in\b|\btrade\s*value|\bappraisal\b/i,
  /\b(?:schedule|book)\s+.*test\s*drive/i,
  /\binventory\b/i,
  /\/inventory|\/used[\-/]|\/vdp\b|search(?:new|used)/i,
];

function automotiveStrength(blob: string): number {
  return 1 + score(blob, [/\b(msrp|apr|financ|lease|horsepower|mileage|warranty|trade)\b/i]);
}

/**
 * Split OEM brand sites vs dealer retail when both look automotive.
 * Defaults to retail on ties (sidewalk inventory is the more common hosted case).
 */
function classifyAutomotiveVertical(path: string, blob: string): { vertical: "auto_oem" | "auto_retail"; strength: number } {
  const hay = `${path} ${blob}`;
  const oemHits = countSignalHits(hay, OEM_AUTO_SIGNALS);
  const retailHits = countSignalHits(hay, RETAIL_AUTO_SIGNALS);
  const strength = automotiveStrength(blob);

  if (oemHits > retailHits) {
    return { vertical: "auto_oem", strength };
  }
  if (retailHits > oemHits) {
    return { vertical: "auto_retail", strength };
  }
  // Tie-break on URL shape
  if (/\/inventory|\/used|\/pre-owned|\/vdp|search(?:new|used)/i.test(path)) {
    return { vertical: "auto_retail", strength };
  }
  if (/shopping-tools|\/build[\-/]|build-and-price|\/models?\/|configurator/i.test(path)) {
    return { vertical: "auto_oem", strength };
  }
  return { vertical: "auto_retail", strength };
}

/**
 * Rules-first vertical guess from URL + light scan tokens (no ML).
 */
export function classifyVertical(
  scan: SiteScanSummary,
  pathname: string,
): { vertical: SiteVertical; confidence: number } {
  const path = pathname.toLowerCase();
  const blob = `${path} ${scan.page_title} ${scan.top_terms.join(" ")} ${scan.content_themes.join(" ")}`.toLowerCase();

  const oemHits = countSignalHits(`${path} ${blob}`, OEM_AUTO_SIGNALS);
  const retailHits = countSignalHits(`${path} ${blob}`, RETAIL_AUTO_SIGNALS);

  if (automotiveBroadHit(path, blob) || oemHits >= 2 || retailHits >= 2) {
    const { vertical, strength } = classifyAutomotiveVertical(path, blob);
    return { vertical, confidence: Math.min(95, 68 + strength * 8) };
  }

  const scores: Array<{ v: SiteVertical; s: number }> = [
    {
      v: "ecommerce",
      s: score(blob, [
        /\b(cart|checkout|sku|shop|store|add\s+to\s+bag|shipping|coupon)\b/i,
        /\/product\//i,
      ]),
    },
    {
      v: "publisher_content",
      s: score(blob, [
        /\b(blog|article|post|newsletter|author|editorial|insights|magazine)\b/i,
        /\/(blog|posts?|articles?|news)\b/i,
      ]),
    },
    {
      v: "healthcare",
      s: score(blob, [
        /\b(patient|hospital|clinic|physician|surgeon|medical|dentist|telehealth|healthcare|pharmacy|urgent care)\b/i,
      ]),
    },
    {
      v: "real_estate",
      s: score(blob, [/\b(realtor|realty|mls|listing|homes for sale|square feet|bedroom|hoa|open house|condo)\b/i]),
    },
    {
      v: "financial_services",
      s: score(blob, [
        /\b(mortgage|refinance|wealth|brokerage|401k|ira|loan|credit union|banking|investment advisor|insurance quote)\b/i,
      ]),
    },
    {
      v: "home_services",
      s: score(blob, [/\b(hvac|plumbing|electrical|roofing|landscaping|remodel|contractor|exterminator|siding|windows)\b/i]),
    },
    {
      v: "travel_hospitality",
      s: score(blob, [/\b(hotel|resort|booking|flights|itinerary|hospitality|vacation|bnb|check in|guest)\b/i]),
    },
    {
      v: "education",
      s: score(blob, [/\b(university|college|campus|curriculum|admissions|degree|scholarship|student|course catalog)\b/i]),
    },
    {
      v: "local_services",
      s: score(blob, [/\b(near me|locally owned|service area|same day|appointments|call us today|free estimate)\b/i]),
    },
    {
      v: "b2b_saas",
      s: score(blob, [
        /\b(saas|platform|workflow|integration|\bapi\b|teams|demo|pricing|trial|signup|b2b)\b/i,
        /\b(software|dashboard|workspace|subscription)\b/i,
      ]),
    },
    {
      v: "professional_services",
      s: score(blob, [/\b(consulting|services|clients|capabilities|case\s+study|agency)\b/i]),
    },
    {
      v: "lead_generation",
      s: score(blob, [/\b(get\s+a\s+quote|contact\s+us|book\s+a\s+call|request\s+info)\b/i]),
    },
    {
      v: "nonprofit",
      s: score(blob, [/\b(donate|volunteer|501|mission|nonprofit|charity)\b/i]),
    },
  ];

  scores.sort((a, b) => b.s - a.s);
  const best = scores[0]!;
  if (best.s >= 2) {
    return { vertical: best.v, confidence: Math.min(92, 55 + best.s * 12) };
  }
  if (best.s === 1) {
    return { vertical: best.v, confidence: 62 };
  }

  /** Rich token list alone is not B2B SaaS — prefer generic buckets unless explicit SaaS cues exist. */
  if (scan.top_terms.length >= 6) {
    const explicitB2bSaas = /\b(saas|platform|software|\bapi\b|integration|demo|free\s+trial|pricing|subscription|workflow|dashboard|cloud)\b/i.test(
      blob,
    );
    if (explicitB2bSaas) {
      return { vertical: "b2b_saas", confidence: 56 };
    }
    const contentish =
      /\b(blog|insights|articles?|news|editorial|magazine|podcast|resources)\b/i.test(blob) ||
      /\/(blog|news|articles?|resources)\b/i.test(path);
    if (contentish) {
      return { vertical: "content_led_business", confidence: 49 };
    }
    return { vertical: "general_business", confidence: 47 };
  }

  return { vertical: "unknown", confidence: 38 };
}
