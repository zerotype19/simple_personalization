(function () {
  function mergeParams() {
    var env = window.SessionIntel && window.SessionIntel.getExperienceDecisionEnvelope
      ? window.SessionIntel.getExperienceDecisionEnvelope()
      : null;
    var p = env && env.primary_decision;
    var prev =
      typeof window.targetPageParams === "function"
        ? window.targetPageParams()
        : window.targetPageParams || {};
    if (!p) return prev || {};
    return Object.assign({}, prev, {
      si_surface_id: p.surface_id,
      si_action: p.action,
      si_offer_type: p.offer_type,
      si_message_angle: p.message_angle,
      si_timing: p.timing,
      si_confidence: p.confidence,
      si_session_id: env.session_id,
    });
  }
  function wire() {
    if (!window.SessionIntel || !window.SessionIntel.subscribeToAllDecisions) return;
    window.SessionIntel.subscribeToAllDecisions(function () {
      window.targetPageParams = function () {
        return mergeParams();
      };
      if (typeof adobe !== "undefined" && adobe.target && typeof adobe.target.triggerView === "function") {
        try {
          adobe.target.triggerView(window.location.pathname);
        } catch (e) {
          /* Target not ready */
        }
      }
    });
    window.targetPageParams = function () {
      return mergeParams();
    };
  }
  var boot = window.__siBootFromTag;
  if (boot && typeof boot.then === "function") boot.then(wire).catch(function () {});
  else wire();
})();
