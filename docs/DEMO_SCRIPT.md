# Demo script — Velocity Motors + Session Intelligence

Speaker notes for the **hosted** Cloudflare setup (Pages + Worker + D1). Aligns with [DEMO_WALKTHROUGH.md](./DEMO_WALKTHROUGH.md) and the generated [webmaster demo guide](../apps/demo-retailer/public/integration/session-intelligence-webmaster-demo-guide.md).

**Default URLs**

| App | URL |
|-----|-----|
| Demo retailer | `https://si-session-demo.pages.dev` |
| Operator dashboard | `https://si-session-dashboard.pages.dev` |
| Worker (API) | Your deployed origin, e.g. `https://session-intelligence-worker.<subdomain>.workers.dev` |

Use **SAY** / **DO** / **CUE** as blocks: SAY is optional narration, DO is on-screen action, CUE is a discussion prompt.

---

## Setup (before anyone joins)

**DO:** Open a **normal** browser window first (not Incognito) so one anonymous `session_id` persists across steps.

**DO:** Open two tabs:

- **Demo:** `https://si-session-demo.pages.dev/` (or your deployed demo URL)
- **Dashboard:** `https://si-session-dashboard.pages.dev/`

**OPTIONAL DO:** DevTools → **Network**, filter by your Worker host or `collect`, to show `POST /collect` after navigation.

**SAY (10 sec):** “This is a fake dealer site, **Velocity Motors**, with the real Session Intelligence tag. Everything is **anonymous** in this tab: session storage, summarized signals — we are not shipping raw HTML through a model path in the default tag.”

**CUE:** *What do you already use for on-site personalization or A/B — and where does anonymous behavior usually drop out?*

---

## Act 1 — What we are proving (30–45 sec)

**SAY:** “Three proofs in one demo: the **SDK** loads config from the Worker, tracks **page types and CTAs**, and **POSTs** anonymized summaries to `/collect`. The **dashboard** reads aggregated metrics from the same Worker. A **conversion** fires when we submit the **Test drive** form.”

**CUE:** *If we only had page views in analytics, what decision would you still be guessing?*

---

## Act 2 — On-site: strip + inspector

### 2a — Session strip

**DO:** Land on **Home**. Point at the **Session Intelligence** strip under the nav.

**SAY:** “Border color is a quick read: **control** vs **experiment** vs **rule-driven** personalization. Open **Signals** here to watch counts move as we browse.”

**CUE:** *Where would you surface this internally — growth, merchandising, or experimentation?*

### 2b — Open the inspector

**DO:** Click the **SI** chip (lower-left) **or** press **⌘+Shift+Backtick** (Mac) / **Ctrl+Shift+Backtick** (Windows/Linux). Use the **backtick** key (usually above Tab), not **D** — Chrome reserves **Ctrl+Shift+D** for “bookmark all tabs.”

**SAY:** “This is the **debug / operator** view. On customer sites you would typically hide it or gate it; for demos we often force it on or use `?si_debug=1` per the integration guide.”

**OPTIONAL DO:** In the inspector, use **Session storage → Clear session (no reload)** to wipe `sessionStorage` key `si:session` and get a **new anonymous session** and fresh A/B assignment without reloading the tab. **Clear session & reload** does the same then refreshes the page.

**CUE:** *When you hear “session,” do you need it to survive only this visit, or tie to login — and why?*

### 2c — Narrate the panel (pick 2–3 sections; do not read every field)

**DO:** Scan **anonymous visitor read**, **inferred need**, **recommended personalization signal**, and **activation payload** preview when shown.

**SAY:** “This is the same envelope you can push to **dataLayer**, Adobe, or Optimizely. The tag **does not** auto-change prices or pop modals; **your** rules decide what to do with `recommended_surface`, timing, and confidence.”

**DO:** Navigate **Home → Inventory →** open a **vehicle (VDP)**.

**SAY:** “VDP is a first-class page type — it feeds scoring and language so auto journeys do not read like generic retail.”

**DO:** Open **Finance**, then optionally **Compare** and **Trade-in**.

**SAY:** “Each route adds **diversity** to the session summary — traffic shape, journey, finance touches — all summarized, not screenshots of the DOM.”

**CUE:** *Which single signal here would change your next best action on the homepage vs on a VDP?*

---

## Act 3 — Operator dashboard (first pass)

**DO:** Switch to the **dashboard** tab; **refresh** once.

**SAY:** “**Unique sessions** includes anything already in D1 — not only us — so treat absolute numbers as environment-dependent. The **story** is that our traffic shows up after collects succeed.”

**CUE:** *Who owns “experiment readout” today — and what would make them trust this view?*

---

## Act 4 — Conversion

**DO:** Return to the **demo** tab → **Test drive**. Submit the form (notes optional). Dismiss the demo **alert**.

**SAY:** “That calls `markConversion('lead_submit')` — the Worker marks this session converted for reporting.”

**DO:** **Dashboard** tab → **refresh** (wait a few seconds if needed; hard-refresh once).

**SAY:** “**Conversions** should be at least flat-to-up versus before. If not, we check Network for **2xx on `/collect`** and that we converted **after** at least one collect in this session.”

**CUE:** *Is “lead submit” the right north star for your funnel, or do you need multi-step micro-conversions?*

---

## Act 5 — Experiments table (if time)

**DO:** In the dashboard, open the **Experiments** section (variants, sessions, CTA CTR, conversion %).

**SAY:** “This is **pooled** experiment aggregation from the Worker — same data plane as collect, not a separate silo.”

**CUE:** *How would you gate a treatment on both **variant** and **behavioral confidence**?*

---

## Privacy and trust (60 sec — compliance-friendly)

**SAY:**

- **Anonymous session** in **sessionStorage** (`si:session`), not a cross-site identity graph by default.
- **No embeddings, no vector DB, no third-party model calls** in the default tag path.
- **`/collect`** sends **summarized** scores and category-style affinity — not a dump of page HTML. (Field details: `packages/sdk` batcher / data dictionary.)

**CUE:** *What would your security team still want in a DPIA or vendor questionnaire?*

---

## Close — integration hook

**SAY:** “Snippet is one script tag; CSP must allow **fetch** to your Worker for `/config` and `/collect`. Hosting and headers: [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md).”

**CUE:** *What is the first production page you would instrument — homepage, PLP, or checkout-adjacent?*

---

## If something breaks (say this on screen)

| Symptom | What to say |
|--------|-------------|
| Dashboard error banner | “Likely Worker URL or CORS — the Pages build has to bake in the correct `VITE_SI_WORKER_URL`.” |
| Metrics never move | “Watch **`POST …/collect`** — the inspector should still show local activity.” |
| Conversion stuck | “Submit **Test drive** after at least one collect for this session, then refresh the dashboard.” |

---

## Timing

- **Tight run:** ~8–12 minutes  
- **With discussion:** ~15 minutes using **CUE** prompts  

---

## Related

- [DEMO_WALKTHROUGH.md](./DEMO_WALKTHROUGH.md) — URLs, scripted curl smoke checks, troubleshooting table  
- [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md) — snippet URL, CSP, inspector quirks  
- `scripts/demo-walkthrough.sh` — optional curl checks against Worker + Pages (does not drive the browser)
