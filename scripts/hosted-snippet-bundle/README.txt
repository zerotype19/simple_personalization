Optiview hosted snippet bundle
==============================

Built for production API: see cdn/version.json → worker_url (typically https://api.optiview.ai)
Snippet / CSS origin: see cdn/version.json → snippet_origin (typically https://cdn.optiview.ai)

cdn/
  si.js              — Optiview IIFE (drop-in tag)
  si-inspector.css   — Inspector panel styles (loaded by si.js)
  version.json       — Build metadata (commit, built_at, worker_url, snippet_origin)
  health.json        — Liveness probe for CDN deploys
  _headers           — Cloudflare Pages cache rules (beta: max-age=300 on JS/CSS)
  snippet-health.html — Same-origin HEAD check for /si.js (optional)

docs/
  CUSTOMER_INSTALL.md
  WEBMASTER_INSTALL_ONE_PAGER.md
  SNIPPET_HOSTING.md
  SECURITY_PRIVACY_FAQ.md

Quick install (production CDN)
------------------------------
<script async src="https://cdn.optiview.ai/si.js" data-si-key="YOUR_PUBLIC_SNIPPET_KEY"></script>

Self-hosting warning
--------------------
If you upload cdn/si.js and cdn/si-inspector.css WITHOUT rebuilding, the tag still:
  - calls the baked API host (version.json → worker_url), and
  - loads inspector CSS from the baked snippet_origin (version.json → snippet_origin).

To use YOUR static host for both files AND your own API/CSS URLs, rebuild before upload:

  VITE_SI_WORKER_URL=https://api.optiview.ai \
  VITE_SI_SNIPPET_ORIGIN=https://YOUR_SNIPPET_HOST \
  pnpm build:snippet

Then upload the new cdn/ artifacts together on one origin.

Verify install
--------------
typeof window.SessionIntel === "object"
typeof window.SessionIntel.getExperienceDecisionEnvelope === "function"
window.SessionIntel.getExperienceDecisionEnvelope()

Inspector: SI chip (bottom-left) or Ctrl+Shift+` (backtick)

Cache (beta)
------------
Unversioned si.js uses max-age=300 during beta. Prefer versioned URLs
(https://cdn.optiview.ai/si.js?v=<commit>) for demos; production may move to
immutable versioned assets with longer TTL later.

Live CDN
--------
https://cdn.optiview.ai/si.js
https://cdn.optiview.ai/si-inspector.css
https://cdn.optiview.ai/version.json
