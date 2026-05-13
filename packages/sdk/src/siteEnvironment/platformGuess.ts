import type { PlatformGuess } from "@si/shared";

export function guessPlatform(): PlatformGuess {
  if (typeof document === "undefined") return "unknown";
  const gen = document.querySelector('meta[name="generator"]')?.getAttribute("content") ?? "";
  const g = gen.toLowerCase();
  if (g.includes("shopify")) return "shopify";
  if (g.includes("wordpress") || g.includes("wp ")) return "wordpress";
  if (g.includes("webflow")) return "webflow";
  if (g.includes("squarespace")) return "squarespace";
  for (const s of document.querySelectorAll("script[src]")) {
    const src = (s as HTMLScriptElement).src.toLowerCase();
    if (src.includes("cdn.shopify.com") || src.includes("shopify")) return "shopify";
    if (src.includes("wp-content") || src.includes("wordpress")) return "wordpress";
  }
  try {
    if ((window as unknown as { Shopify?: unknown }).Shopify) return "shopify";
  } catch {
    /* ignore */
  }
  return "unknown";
}
