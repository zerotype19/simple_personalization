# Demo walkthrough — Velocity Motors + Session Intelligence dashboard

This guide matches the **hosted** Cloudflare setup (Pages + Worker + D1). The **dashboard** and **demo retailer** are deployed together when you run `pnpm cloudflare:bootstrap` from the repo root: both Vite apps are built with the same `VITE_SI_WORKER_URL`, then each Pages project is updated.

## URLs (defaults for this repo’s production names)

Override any of these with environment variables when running `scripts/demo-walkthrough.sh`.

| App | Default URL |
|-----|----------------|
| Demo retailer | `https://si-session-demo.pages.dev` |
| Operator dashboard | `https://si-session-dashboard.pages.dev` |
| Worker (API) | Set after deploy; example: `https://session-intelligence-worker.<your-subdomain>.workers.dev` |

If your Worker hostname differs, set `SI_WORKER_URL` for the script (see below) and use the Worker URL printed by Wrangler after `pnpm cloudflare:deploy:worker` or `pnpm cloudflare:bootstrap`.

## What you are proving

1. The **SDK** loads config from the Worker, tracks page types and CTAs, and **POSTs** anonymized summaries to **`/collect`**.
2. The **dashboard** reads **`/dashboard/summary`** and **`/dashboard/experiments`** from the same Worker (unique sessions, conversions, experiment variants).
3. A **conversion** is recorded when you submit the demo **Test drive** form (`markConversion("lead_submit")`).

## Before you start

- Use a **normal** browser window first (so one `session_id` persists across steps). Optionally repeat in **Incognito** to see a second session.
- Optional: open **DevTools → Network**, filter by `collect` or your Worker host, to watch **`POST /collect`** after navigation.

## Scripted smoke checks (optional)

From the **monorepo root**:

```bash
chmod +x scripts/demo-walkthrough.sh   # once, if needed
SI_WORKER_URL="https://YOUR-WORKER.workers.dev" ./scripts/demo-walkthrough.sh
```

With defaults baked into the script for the account used in this repo’s last deploy, you can run:

```bash
./scripts/demo-walkthrough.sh
```

Add `--open` on macOS to open the demo and dashboard in the default browser:

```bash
./scripts/demo-walkthrough.sh --open
```

The script only **curl**s the Worker and Pages; it does not drive the browser through the narrative below.

## Manual demo script (narrative)

Do these in order in the **demo** tab. Keep the **dashboard** open in another tab and **refresh** it after steps 6 and 8.

1. **Open the demo**  
   Go to `https://si-session-demo.pages.dev/` (or your `SI_DEMO_URL`). Wait for the hero; the SDK boots before the app renders.

2. **Open the Session Intelligence inspector**  
   **Windows/Linux:** `Ctrl+Shift+D`  
   **Mac:** `Control+Shift+D`  
   Confirm the inspector opens (forced on in this demo via `forceInspector: true` in `main.tsx`).

3. **Home**  
   Stay on Home. Notice **page** context is `home` (via `useSiPage("home")`). Optionally click **Browse inventory** (primary CTA with `data-si-cta`).

4. **Inventory → Vehicle detail (VDP)**  
   Go to **Inventory**, open any vehicle. This sets page type **`vdp`**, which feeds VDP-related signals in the scorer.

5. **Finance**  
   Open **Finance** from the nav. Interact with any payment controls on the page if present (finance interactions are part of the summary payload).

6. **Compare or Trade-in (optional)**  
   Visit **Compare** and/or **Trade-in** to add more page diversity. Each route change triggers collection behavior according to the SDK.

7. **First dashboard check**  
   Open `https://si-session-dashboard.pages.dev/`, refresh once. You should see **Sessions (unique)** reflect D1 data (seeded demo slice **plus** your live session). Numbers may include existing traffic, not only your browser.

8. **Conversion — Test drive**  
   In the demo, go to **Test drive**. Submit the form (optional notes). Dismiss the demo **alert**. This calls **`markConversion("lead_submit")`**, which marks the session converted for the Worker.

9. **Second dashboard check**  
   Refresh the dashboard. **Conversions** should be at least as high as before; your session counts as converted if D1 received the payload (allow a few seconds, then hard-refresh if needed).

10. **Experiments table**  
    Under **Experiments**, confirm variants show **unique sessions**, **CTA CTR**, **Conversion %**, and lift columns. These come from the Worker’s experiment aggregation (pooled CTR, session-level conversion rate).

## Local alternative

To run the same story against **localhost**:

- Terminal 1: `pnpm dev:worker` (Worker + local D1/Miniflare per your setup).
- Terminal 2: `pnpm dev:demo` and `pnpm dev:dashboard` with `VITE_SI_WORKER_URL` pointing at that Worker (see `docs/CLOUDFLARE.md`).

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Dashboard red error banner | Worker not reachable from the browser (CORS, wrong `VITE_SI_WORKER_URL` at build time, or Worker down). Rebuild Pages with the correct Worker origin and redeploy. |
| Metrics never move | Network tab: is **`POST …/collect`** returning **2xx**? Inspector should show activity. |
| Conversion stuck at 0 | Complete **Test drive** submit after the SDK has sent at least one collect for this session; then refresh the dashboard. |
