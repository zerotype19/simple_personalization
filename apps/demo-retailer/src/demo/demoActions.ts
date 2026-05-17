import { softResetSession } from "@si/sdk";

let highlightClearTimer: ReturnType<typeof setTimeout> | null = null;

export function resetDemoSession(): void {
  softResetSession();
  document.body.classList.remove("demo-inspector-highlight");
  if (highlightClearTimer != null) {
    clearTimeout(highlightClearTimer);
    highlightClearTimer = null;
  }
}

function clickInspectorLauncher(): void {
  const launcher = document.getElementById("si-inspector-launcher");
  if (launcher instanceof HTMLElement) {
    launcher.click();
    return;
  }
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "`", code: "Backquote", ctrlKey: true, shiftKey: true, bubbles: true }),
  );
}

export function openInspector(): void {
  const panel = document.getElementById("si-inspector-panel");
  if (panel?.classList.contains("open")) return;
  clickInspectorLauncher();
}

/** Buyer mode + open drawer — used after form submit for the “aha” moment. */
export function openInspectorAfterSubmit(): void {
  try {
    sessionStorage.setItem("si:inspector_mode", "buyer");
  } catch {
    /* ignore */
  }

  if (highlightClearTimer != null) {
    clearTimeout(highlightClearTimer);
    highlightClearTimer = null;
  }
  document.body.classList.add("demo-inspector-highlight");

  window.setTimeout(() => {
    const panel = document.getElementById("si-inspector-panel");
    const alreadyOpen = panel?.classList.contains("open") ?? false;
    if (alreadyOpen) {
      clickInspectorLauncher();
      window.setTimeout(() => clickInspectorLauncher(), 120);
    } else {
      clickInspectorLauncher();
    }
  }, 400);

  highlightClearTimer = setTimeout(() => {
    document.body.classList.remove("demo-inspector-highlight");
    highlightClearTimer = null;
  }, 8000);
}
