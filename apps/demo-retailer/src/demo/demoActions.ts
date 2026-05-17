import { softResetSession } from "@si/sdk";

export function resetDemoSession(): void {
  softResetSession();
  document.body.classList.remove("demo-inspector-highlight");
}

export function openInspector(): void {
  const launcher = document.getElementById("si-inspector-launcher");
  if (launcher instanceof HTMLElement) {
    launcher.click();
    return;
  }
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "`", code: "Backquote", ctrlKey: true, shiftKey: true, bubbles: true }),
  );
}

/** Buyer mode + open drawer — used after form submit for the “aha” moment. */
export function openInspectorAfterSubmit(): void {
  try {
    sessionStorage.setItem("si:inspector_mode", "buyer");
  } catch {
    /* ignore */
  }
  document.body.classList.add("demo-inspector-highlight");
  window.setTimeout(() => {
    openInspector();
  }, 400);
  window.setTimeout(() => {
    document.body.classList.remove("demo-inspector-highlight");
  }, 8000);
}
