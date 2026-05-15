import { describe, expect, it } from "vitest";
import { formatTimelineClock, formatTimelineLabelForBuyer } from "../sessionIntel";

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

describe("formatTimelineLabelForBuyer", () => {
  const t0 = 1_000_000;

  it("labels the first milestone as Initial visit", () => {
    expect(formatTimelineLabelForBuyer(t0, t0 + 5_000, null)).toBe("Initial visit");
  });

  it("uses qualitative labels for long session spans instead of H:MM:SS clocks", () => {
    const long = t0 + 4 * 3600 * 1000;
    expect(formatTimelineLabelForBuyer(t0, long, t0 + 1_000)).toMatch(/Later|After extended reading|After returning to content/);
    expect(formatTimelineLabelForBuyer(t0, long, t0 + 1_000)).not.toMatch(/^\d+:\d+:\d+$/);
  });

  it("uses MM:SS for dense milestones within the first hour of a session", () => {
    const a = t0 + 10_000;
    const b = t0 + 70_000;
    expect(formatTimelineLabelForBuyer(t0, b, a)).toMatch(/^\d{2}:\d{2}$/);
  });
});
