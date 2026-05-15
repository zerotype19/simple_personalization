(function () {
  function showEl(id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = !show;
  }
  function wireShipping() {
    if (!window.SessionIntel || !window.SessionIntel.subscribeToDecision) return;
    window.SessionIntel.subscribeToDecision("cart_assist_inline", function () {
      var d = window.SessionIntel.getExperienceDecision("cart_assist_inline");
      showEl("si-shipping-reassurance", d.action === "show");
    });
    var d0 = window.SessionIntel.getExperienceDecision("cart_assist_inline");
    showEl("si-shipping-reassurance", d0.action === "show");
  }
  function wireCompare() {
    if (!window.SessionIntel || !window.SessionIntel.subscribeToDecision) return;
    window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
      var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
      showEl("si-product-comparison", d.action === "show");
    });
    var d0 = window.SessionIntel.getExperienceDecision("article_inline_mid");
    showEl("si-product-comparison", d0.action === "show");
  }
  function run() {
    try {
      wireShipping();
      wireCompare();
    } catch (e) {
      /* SessionIntel not booted */
    }
  }
  var boot = window.__siBootFromTag;
  if (boot && typeof boot.then === "function") boot.then(run).catch(function () {});
  else run();
})();
