import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInspectorPanelMode,
  INSPECTOR_MODE_STORAGE_KEY,
  resetInspectorPanelModeState,
  setInspectorPanelMode,
} from "./inspectorPanelMode";

function stubWindow(search: string, storage: Record<string, string> = {}) {
  vi.stubGlobal("window", {
    location: { search, href: `https://example.com/${search}` },
    sessionStorage: {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
    },
  });
  return storage;
}

describe("inspector panel mode precedence", () => {
  afterEach(() => {
    resetInspectorPanelModeState();
    vi.unstubAllGlobals();
  });

  it("debug URL + stored buyer → operator default", () => {
    stubWindow("?si_debug=1", { [INSPECTOR_MODE_STORAGE_KEY]: "buyer" });
    expect(getInspectorPanelMode()).toBe("operator");
  });

  it("debug URL + manual toggle buyer → buyer during same page session", () => {
    stubWindow("?si_debug=1", { [INSPECTOR_MODE_STORAGE_KEY]: "buyer" });
    expect(getInspectorPanelMode()).toBe("operator");
    setInspectorPanelMode("buyer");
    expect(getInspectorPanelMode()).toBe("buyer");
    setInspectorPanelMode("operator");
    expect(getInspectorPanelMode()).toBe("operator");
  });

  it("debug URL toggle does not persist buyer to sessionStorage", () => {
    const storage = stubWindow("?si_debug=1", {});
    setInspectorPanelMode("buyer");
    expect(getInspectorPanelMode()).toBe("buyer");
    resetInspectorPanelModeState();
    expect(getInspectorPanelMode()).toBe("operator");
    expect(storage[INSPECTOR_MODE_STORAGE_KEY]).toBeUndefined();
  });

  it("non-debug + stored buyer → buyer", () => {
    stubWindow("", { [INSPECTOR_MODE_STORAGE_KEY]: "buyer" });
    expect(getInspectorPanelMode()).toBe("buyer");
  });

  it("non-debug + stored operator → operator", () => {
    stubWindow("", { [INSPECTOR_MODE_STORAGE_KEY]: "operator" });
    expect(getInspectorPanelMode()).toBe("operator");
  });

  it("non-debug with no storage defaults to buyer", () => {
    stubWindow("", {});
    expect(getInspectorPanelMode()).toBe("buyer");
  });

  it("non-debug toggle persists to sessionStorage", () => {
    const storage = stubWindow("", {});
    setInspectorPanelMode("operator");
    expect(storage[INSPECTOR_MODE_STORAGE_KEY]).toBe("operator");
    resetInspectorPanelModeState();
    expect(getInspectorPanelMode()).toBe("operator");
  });

  it("sessionStorage si:debug counts as debug context for operator default", () => {
    stubWindow("", { "si:debug": "1", [INSPECTOR_MODE_STORAGE_KEY]: "buyer" });
    expect(getInspectorPanelMode()).toBe("operator");
  });
});
