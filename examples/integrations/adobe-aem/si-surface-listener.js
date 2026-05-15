(function () {
  function syncSurface(surfaceId) {
    if (!window.SessionIntel || !window.SessionIntel.getExperienceDecision) return;
    var d = window.SessionIntel.getExperienceDecision(surfaceId);
    var nodes = document.querySelectorAll('[data-si-surface="' + surfaceId + '"]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].hidden = d.action !== "show";
    }
  }
  function onEnvelope() {
    var seen = Object.create(null);
    document.querySelectorAll("[data-si-surface]").forEach(function (el) {
      var id = el.getAttribute("data-si-surface");
      if (!id || seen[id]) return;
      seen[id] = true;
      syncSurface(id);
    });
  }
  function wire() {
    document.addEventListener("si:experience-decision", onEnvelope);
    if (window.SessionIntel && window.SessionIntel.subscribeToAllDecisions) {
      window.SessionIntel.subscribeToAllDecisions(onEnvelope);
    }
    onEnvelope();
  }
  var boot = window.__siBootFromTag;
  if (boot && typeof boot.then === "function") boot.then(wire).catch(function () {});
  else wire();
})();
