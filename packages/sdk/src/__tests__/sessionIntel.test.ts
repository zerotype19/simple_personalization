import { describe, expect, it } from "vitest";
import { formatTimelineClock } from "../sessionIntel";

describe("formatTimelineClock", () => {
  it("formats under one hour as MM:SS", () => {
    const t0 = 1_000_000;
    expect(formatTimelineClock(t0, t0 + 3_000)).toBe("00:03");
    expect(formatTimelineClock(t0, t0 + 59_000)).toBe("00:59");
    expect(formatTimelineClock(t0, t0 + 3_599_000)).toBe("59:59");
  });

  it("formats one hour or more as H:MM:SS (no unbounded minute clock)", () => {
    const t0 = 0;
    expect(formatTimelineClock(t0, 3_600_000)).toBe("1:00:00");
    expect(formatTimelineClock(t0, 3_661_000)).toBe("1:01:01");
    expect(formatTimelineClock(t0, 91_541_000)).toBe("25:25:41");
  });
});
