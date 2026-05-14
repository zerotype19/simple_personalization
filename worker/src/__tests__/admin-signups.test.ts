import { describe, expect, it } from "vitest";
import { isValidSignupId, parseSignupAdminPatchStatus } from "../adminSignups";

describe("parseSignupAdminPatchStatus", () => {
  it("accepts reviewed, approved, rejected", () => {
    expect(parseSignupAdminPatchStatus("reviewed")).toBe("reviewed");
    expect(parseSignupAdminPatchStatus("Approved")).toBe("approved");
    expect(parseSignupAdminPatchStatus("REJECTED")).toBe("rejected");
  });

  it("rejects pending and garbage", () => {
    expect(parseSignupAdminPatchStatus("pending")).toBeNull();
    expect(parseSignupAdminPatchStatus("")).toBeNull();
    expect(parseSignupAdminPatchStatus(1)).toBeNull();
  });
});

describe("isValidSignupId", () => {
  it("accepts UUID-shaped ids", () => {
    expect(isValidSignupId("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidSignupId("not-a-uuid")).toBe(false);
    expect(isValidSignupId("")).toBe(false);
  });
});
