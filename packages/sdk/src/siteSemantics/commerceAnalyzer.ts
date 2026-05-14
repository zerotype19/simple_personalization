export function detectCommerceSignals(): string[] {
  if (typeof document === "undefined") return [];
  const out: string[] = [];
  let body = "";
  try {
    body = (document.body?.innerText ?? "").slice(0, 8000).toLowerCase();
  } catch {
    return [];
  }
  if (/\badd to cart\b|\badd-to-cart\b/i.test(body)) out.push("add_to_cart_language");
  if (/\$\s?\d|\beur\b|\bgbp\b|\bprice\b/i.test(body)) out.push("price_language");
  if (/\bcheckout\b|\bbag\b|\bcart\b/i.test(body)) out.push("cart_checkout_language");
  if (/\breviews?\b|\brating\b|\bstars?\b/i.test(body)) out.push("reviews_language");
  return [...new Set(out)].slice(0, 8);
}
