import { describe, expect, it } from "vitest";
import { classifyCtaText } from "../siteSemantics/ctaClassifier";

describe("classifyCtaText", () => {
  it("treats checkout and book demo as hard conversion", () => {
    expect(classifyCtaText("Buy now")).toBe("hard");
    expect(classifyCtaText("Checkout")).toBe("hard");
    expect(classifyCtaText("Book a demo")).toBe("hard");
    expect(classifyCtaText("Request a quote")).toBe("hard");
  });

  it("treats learn more and subscribe as soft conversion", () => {
    expect(classifyCtaText("Learn more")).toBe("soft");
    expect(classifyCtaText("Subscribe to newsletter")).toBe("soft");
    expect(classifyCtaText("Read more")).toBe("soft");
  });

  it("classifies navigation-only labels", () => {
    expect(classifyCtaText("Products")).toBe("navigation");
    expect(classifyCtaText("About us")).toBe("navigation");
  });

  it("classifies support/account labels", () => {
    expect(classifyCtaText("Customer support")).toBe("support");
    expect(classifyCtaText("Sign in")).toBe("support");
  });
});
