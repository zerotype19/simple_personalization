(function () {
  function pushHelper() {
    if (window.SessionIntel && window.SessionIntel.pushExperienceDecisionToOptimizely) {
      window.SessionIntel.pushExperienceDecisionToOptimizely();
    }
  }
  function pushAttributes() {
    var env = window.SessionIntel && window.SessionIntel.getExperienceDecisionEnvelope
      ? window.SessionIntel.getExperienceDecisionEnvelope()
      : null;
    var p = env && env.primary_decision;
    if (!p || !window.optimizely || typeof window.optimizely.push !== "function") return;
    window.optimizely.push({
      type: "user",
      attributes: {
        si_surface_id: p.surface_id,
        si_action: p.action,
        si_offer_type: p.offer_type,
        si_message_angle: p.message_angle,
        si_timing: p.timing,
        si_confidence: String(p.confidence),
      },
    });
  }
  function wire() {
    if (!window.SessionIntel || !window.SessionIntel.subscribeToAllDecisions) return;
    window.SessionIntel.subscribeToAllDecisions(function () {
      pushHelper();
      pushAttributes();
    });
    pushHelper();
    pushAttributes();
  }
  var boot = window.__siBootFromTag;
  if (boot && typeof boot.then === "function") boot.then(wire).catch(function () {});
  else wire();
})();
