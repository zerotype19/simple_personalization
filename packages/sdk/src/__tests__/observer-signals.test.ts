import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { SessionProfile } from "@si/shared";
import { startObserver } from "../observer";
import { createBlankSignals } from "../session";
import { minimalProfile } from "../test/fixtures";

describe("startObserver click targets", () => {
  let profile: SessionProfile;
  let stop: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = '<main id="m"></main>';
    profile = minimalProfile({
      signals: createBlankSignals(),
    });
  });

  afterEach(() => {
    stop?.();
    stop = null;
    document.body.innerHTML = "";
  });

  it("increments pricing_views when the click target is a Text node inside [data-si-price]", () => {
    const main = document.getElementById("m")!;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-si-price", "");
    btn.textContent = "$42,500";
    main.appendChild(btn);

    stop = startObserver(() => "home", (mut) => {
      mut(profile);
    });

    const textNode = [...btn.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);

    textNode!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(profile.signals.pricing_views).toBeGreaterThanOrEqual(1);
  });

  it("increments compare_interactions for Text-node clicks inside [data-si-compare-item]", () => {
    const main = document.getElementById("m")!;
    const row = document.createElement("button");
    row.type = "button";
    row.setAttribute("data-si-compare-item", "");
    const span = document.createElement("span");
    span.textContent = "SUV A";
    row.appendChild(span);
    main.appendChild(row);

    stop = startObserver(() => "compare", (mut) => {
      mut(profile);
    });

    const textNode = span.firstChild!;
    expect(textNode.nodeType).toBe(Node.TEXT_NODE);
    textNode.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(profile.signals.compare_interactions).toBeGreaterThanOrEqual(1);
  });
});
