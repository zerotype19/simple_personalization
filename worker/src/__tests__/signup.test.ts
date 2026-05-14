import { describe, expect, it } from "vitest";
import { validateSignupBody } from "../signup";

describe("validateSignupBody", () => {
  it("accepts valid payload", () => {
    expect(
      validateSignupBody({
        name: "A",
        email: "a@b.co",
        company: "C",
        website: "example.com",
        use_case: "Test",
        tools: ["GTM", "Adobe"],
      }),
    ).toBeNull();
  });

  it("rejects bad email", () => {
    expect(validateSignupBody({ name: "A", email: "nope", company: "C", website: "x", use_case: "u" })).toEqual({
      error: "email_invalid",
    });
  });

  it("rejects non-array tools", () => {
    expect(
      validateSignupBody({
        name: "A",
        email: "a@b.co",
        company: "C",
        website: "x",
        use_case: "u",
        tools: "GTM",
      }),
    ).toEqual({ error: "tools_invalid" });
  });
});
