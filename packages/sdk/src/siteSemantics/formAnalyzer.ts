import { normalizeReadableText } from "./normalizeText";

export function analyzeForms(): string[] {
  if (typeof document === "undefined") return [];
  const out: string[] = [];
  document.querySelectorAll("form").forEach((form, fi) => {
    if (fi > 12) return;
    const blob = normalizeReadableText(
      `${form.getAttribute("action") ?? ""} ${form.textContent ?? ""}`.slice(0, 800),
    ).toLowerCase();
    if (!blob) return;
    if (/\b(newsletter|subscribe|email)\b/i.test(blob)) out.push("newsletter_signup");
    else if (/\b(demo|book|schedule|request)\b/i.test(blob)) out.push("demo_request");
    else if (/\b(contact|message|inquiry|get in touch)\b/i.test(blob)) out.push("contact_request");
    else if (/\b(checkout|payment|order)\b/i.test(blob)) out.push("checkout");
    else if (/\b(login|sign in|password)\b/i.test(blob)) out.push("account_login");
    else if (/\b(search|query)\b/i.test(blob)) out.push("search");
    else out.push("unknown_form");
  });
  return [...new Set(out)].slice(0, 8);
}
