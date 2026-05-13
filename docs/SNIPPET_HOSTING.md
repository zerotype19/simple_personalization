# Hosted drop-in snippet (`/si.js`)

The demo Pages app can ship a **second entrypoint**: `public/si.js` — the Session Intelligence IIFE with your Worker’s `/config` and `/collect` URLs **baked in**, so other sites only need:

```html
<script async src="https://optiview.ai/si.js"></script>
```

Place the tag **at the end of `<body>`** when you can (still `async` is fine). Scripts in `<head>` can execute **before `document.body` exists**; the SDK now waits for `DOMContentLoaded` in that case, but end-of-body is the most compatible pattern for embeds.

Use your real demo domain if it differs (custom domain on the `si-session-demo` Pages project).

## Content Security Policy (CSP)

Strict sites often block **inline** `<style>` and `style="..."` attributes. The hosted snippet loads **`https://YOUR_DEMO_DOMAIN/si-inspector.css`** next to **`si.js`** (same directory URL) via `<link rel="stylesheet">` when it finds a script whose `src` ends with **`/si.js`**. If no such tag exists (e.g. SDK bundled another way), it falls back to injecting a `<style>` with bundled CSS — that path needs **`style-src 'unsafe-inline'`** or equivalent.

Typical allowlist for **`https://optiview.ai/si.js`** on a publisher site:

- **`script-src`**: include **`https://optiview.ai`** (and **`'unsafe-inline'`** only if you still use other inline scripts).
- **`connect-src`**: include your **Worker** origin (same base as `VITE_SI_WORKER_URL`) for **`/config`** and **`/collect`**.
- **`style-src`**: include **`https://optiview.ai`** so the linked **`si-inspector.css`** can load.

Chrome’s **“CSP blocks eval”** message usually points at **some other script** on the page (analytics, tag managers, A/B tools). The Session Intelligence IIFE does **not** rely on `eval()`. If DevTools attributes it to `script-src`, expand the stack or **Initiator** column to see which file triggered it.

## Friendly check in the browser

Raw **`/si.js`** in a tab often looks like **nothing useful** (blank chrome or a huge block of minified code). That does **not** mean the file failed.

- Open **`https://optiview.ai/snippet-health.html`** (same origin as the snippet). It runs a **`HEAD /si.js`** check and prints status + `Content-Type`. You want **200** and a type containing **`javascript`**.
- Or from a terminal: `curl -sI https://optiview.ai/si.js | grep -i content-type` → should mention **javascript**, not **html**.

## “Redirects” you may see (normal)

- **`http://optiview.ai/...` → `https://optiview.ai/...`** (301): always use **`https://`** in your tag `src`.
- **`https://www.optiview.ai/...` → `https://optiview.ai/...`** (301): prefer the **apex** URL in the snippet, or follow the redirect once; the final response should still be the script.

## Inspector on third-party sites (e.g. rhythm90.io)

- After the script loads, look for the **SI** button at the **bottom-left** of the viewport — it toggles the Session Intelligence drawer. **Do not use Ctrl+Shift+D** in Chrome/Edge: that is reserved for **bookmark all tabs** and will not open our panel.
- Keyboard shortcut: **Ctrl+Shift+Backtick** (the key labeled **\` \~**, usually above Tab), or **⌘+Shift+Backtick** on Mac. Some layouts use the same chord on the **IntlBackslash** key position instead.
- Append **`?si_debug=1`** to the URL for the inspector and **`[Session Intelligence]`** console logs, and (on first paint) **open the drawer immediately**. Prefer a **full reload** with that query already present when **`si.js`** runs; SPAs that add the query later are picked up on the next SDK **`tick`** (see **Debugging** below). **`sessionStorage.setItem('si:debug','1')` + reload** also works.
- **Verify you have the current `si.js`:** the minified file should contain the substring **`si-inspector-launcher`**. If you only see **`Ctrl+Shift+D`** in the inspector hint and no launcher string, your browser or a CDN is still serving an **older** copy — hard-refresh, wait out cache, or append **`?v=2`** to the script URL once to bust cache.
- With a strict **`style-src`**, ensure **`https://optiview.ai`** (or your snippet host) is allowed and that **`/si-inspector.css`** returns **200** in the Network tab. If the stylesheet is blocked or 404, the **SI** control may be effectively invisible.

### Debugging (SPAs, routers, “nothing shows”)

`si.js` runs **once** when the browser first executes it. If your app **client-navigates** to `?si_debug=1` **after** that (router updates the URL without a full reload), the snippet may have already booted **without** seeing the query string. The SDK re-checks on each internal **`tick`** (navigation / signals), but the most reliable approach is still:

- **Hard reload** with `?si_debug=1` already in the bar when the page loads, or
- **`sessionStorage.setItem('si:debug', '1'); location.reload()`** once — later boots treat that like `?si_debug=1` for the inspector and for **`[Session Intelligence]`** console logs, or
- **`data-inspector="1"`** on the `<script src="…/si.js">` tag so the inspector is always enabled for that embed.

In **Console**, filter for **`[Session Intelligence]`** (with `si_debug` or `si:debug` as above) to see lines such as **inspector styles installed** (`link` vs inlined fallback) and **inspector root appended**.

Quick checks in the console:

```js
document.getElementById("si-inspector-root");
window.SessionIntel?.getState?.();
```

In **Network**, filter **`si-inspector`** — you want **`si-inspector.css`** **200** alongside **`si.js`**.

## How it gets built

During `pnpm --filter @si/demo-retailer build`, if **`VITE_SI_WORKER_URL`** is set (no trailing slash — same value you use for the Velocity Motors demo and for Cloudflare Pages env), the build:

1. Runs `pnpm --filter @si/sdk build` with `SI_PUBLIC_WORKER_URL` set to that origin.
2. Copies `packages/sdk/dist/sdk.iife.js` to `apps/demo-retailer/public/si.js` (Vite emits it at **`/si.js`** on the deployed site).
3. Copies `packages/sdk/src/inspector-panel.txt` (CSS text) to **`public/si-inspector.css`** so the inspector can load styles without inline CSS when CSP allows that origin in `style-src`.

If `VITE_SI_WORKER_URL` is unset (typical local `vite` with proxy), **`si.js` is not produced** and any old `public/si.js` is removed so you do not ship a stale snippet.

Optional: set **`VITE_SI_SNIPPET_FORCE_INSPECTOR=1`** for that build so the on-page inspector is always on for the snippet bundle (useful for debugging; omit for a silent embed).

`public/si.js` is gitignored; production snippets come only from CI or your deploy command with env set.

## Deploy flow (e.g. optiview.ai)

1. Point your custom domain at the **Pages** project (`si-session-demo`), not the Worker. The Worker stays on `*.workers.dev` (or its own custom hostname).
2. **Direct upload (Wrangler, “No Git connection”)** — Cloudflare does **not** build your repo. You must build **on the machine that deploys**, with **`VITE_SI_WORKER_URL`** set, then upload `dist`. From the repo root:
   ```bash
   export VITE_SI_WORKER_URL="https://session-intelligence-worker.<subdomain>.workers.dev"
   pnpm cloudflare:deploy:pages
   ```
   That runs `scripts/deploy-pages.sh` (demo + dashboard builds, then `wrangler pages deploy` for both). **`/si.js` is only included if this build runs with the variable set.**
3. **Git-connected Pages** — set **`VITE_SI_WORKER_URL`** under **Settings → Environment variables** for the production build so Cloudflare’s build runner can emit `si.js`. Use a build command like `pnpm install && pnpm --filter @si/demo-retailer build` (not raw `vite build` alone).
4. Optionally set the same value as a **Pages secret** (useful when Cloudflare builds from Git):  
   `printf '%s' 'https://…workers.dev' | pnpm exec wrangler pages secret put VITE_SI_WORKER_URL --project-name=si-session-demo`
5. Confirm **`https://optiview.ai/si.js`** loads as JavaScript (200, non-empty).

## Test the tag on another site

Use any HTML you control (second Pages project, local static server, CMS “custom HTML” block):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Snippet smoke test</title>
  </head>
  <body>
    <h1>External install test</h1>
    <p>Open DevTools → Network and watch for requests to your Worker <code>/collect</code>.</p>
    <!-- Optional: append ?si_debug=1 to this page URL to force the inspector and open the drawer immediately (SI chip or Ctrl+Shift+` still toggles). -->
    <script async src="https://optiview.ai/si.js"></script>
  </body>
</html>
```

Because the Worker sends `access-control-allow-origin: *`, cross-origin `fetch` from the test page to `/config` and `/collect` is allowed. Each `POST /collect` body includes `origin` set to the **test page’s** origin (not optiview.ai), which is how you attribute traffic to the publisher site.

## Troubleshooting: `/si.js` shows the home page (Velocity Motors HTML)

The demo ships SPA fallback in [`public/_redirects`](../apps/demo-retailer/public/_redirects): every path that **does not match a real static file** is rewritten to `/index.html`. So if **`si.js` was never emitted into the build output**, a request to **`https://optiview.ai/si.js`** still returns **200** with the **same HTML as `/`** (same `<title>`), which looks like a “redirect” to the home page.

**Fix:**

1. **If you deploy with Wrangler (no Git):** run a local/CI build with **`VITE_SI_WORKER_URL`** set, then **`pnpm cloudflare:deploy:pages`** (see Deploy flow above). Dashboard-only env vars in the Cloudflare UI **do not** inject into a prebuilt `dist` you upload yourself.
2. **If Cloudflare builds from Git:** In Pages → **si-session-demo** → **Settings → Environment variables**, set **`VITE_SI_WORKER_URL`** to your Worker origin (e.g. `https://session-intelligence-worker.kevin-mcgovern.workers.dev`, no trailing slash). It must be present **at build time**.
3. Use a build command that runs the demo’s **`build` script** (which runs `prepare-hosted-snippet.mjs` before Vite), for example from the repo root:  
   `pnpm install && pnpm --filter @si/demo-retailer build`  
   Do **not** use a naked **`vite build`** when you expect `/si.js` — that skips snippet generation.
4. Redeploy and open **`/si.js`** again. You should see minified JavaScript and `Content-Type: application/javascript` (or `text/javascript`).

Quick check: `curl -sI https://optiview.ai/si.js | head -5` — if **`content-type: text/html`**, the file is still missing from the deployment.

If **`VITE_SI_WORKER_URL`** is set but **`public/si.js`** is still missing before Vite, the build will now **fail** with an explicit error (guard in `vite.config.ts`) instead of silently publishing a broken `/si.js`.
