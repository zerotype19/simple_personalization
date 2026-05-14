export function summarizeLinkIntent(pathname: string): string {
  const p = pathname.toLowerCase();
  const hits: string[] = [];
  if (/\/(demo|get-demo|request-demo)\b/i.test(p)) hits.push("demo paths");
  if (/\/(pricing|plans?)\b/i.test(p)) hits.push("pricing paths");
  if (/\/(contact|talk|meet)\b/i.test(p)) hits.push("contact paths");
  if (/\/(cart|checkout)\b/i.test(p)) hits.push("commerce paths");
  if (hits.length === 0) return "No strong demo/pricing/checkout URL patterns on this path.";
  return `URL patterns suggest: ${hits.join(", ")}.`;
}
