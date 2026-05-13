import { afterEach, describe, expect, it, vi } from "vitest";
import { urlHasSiDebug } from "../si-debug";

describe("urlHasSiDebug", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true when search contains si_debug=1", () => {
    vi.stubGlobal("window", {
      location: { search: "?si_debug=1&x=1", href: "https://example.com/?si_debug=1" },
      sessionStorage: { getItem: () => null },
    });
    expect(urlHasSiDebug()).toBe(true);
  });

  it("is true when sessionStorage si:debug is 1", () => {
    vi.stubGlobal("window", {
      location: { search: "", href: "https://example.com/" },
      sessionStorage: { getItem: (k: string) => (k === "si:debug" ? "1" : null) },
    });
    expect(urlHasSiDebug()).toBe(true);
  });

  it("is false otherwise", () => {
    vi.stubGlobal("window", {
      location: { search: "", href: "https://example.com/" },
      sessionStorage: { getItem: () => null },
    });
    expect(urlHasSiDebug()).toBe(false);
  });
});
