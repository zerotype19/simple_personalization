import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/** Fails fast if Pages/CI runs `vite build` instead of `npm run build` while `VITE_SI_WORKER_URL` is set. */
function assertHostedSnippetWhenWorkerEnv(): Plugin {
  return {
    name: "assert-hosted-snippet",
    buildStart() {
      const worker = (process.env.VITE_SI_WORKER_URL ?? "").trim();
      if (!worker) return;
      const snippet = path.join(rootDir, "public", "si.js");
      if (!existsSync(snippet)) {
        throw new Error(
          "VITE_SI_WORKER_URL is set but public/si.js is missing. Run the full demo build " +
            "(pnpm run build / npm run build), not raw vite build, so prepare-hosted-snippet.mjs runs first. " +
            "See docs/SNIPPET_HOSTING.md — Troubleshooting.",
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [assertHostedSnippetWhenWorkerEnv(), react()],
  resolve: {
    alias: [
      {
        find: "@si/shared/contextBrain",
        replacement: path.resolve(rootDir, "../../packages/shared/src/contextBrain/index.ts"),
      },
      { find: "@si/shared/demoMetrics", replacement: path.resolve(rootDir, "../../packages/shared/src/demoMetrics.ts") },
      { find: "@si/sdk", replacement: path.resolve(rootDir, "../../packages/sdk/src/index.ts") },
      { find: "@si/shared", replacement: path.resolve(rootDir, "../../packages/shared/src/index.ts") },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      "/config": "http://127.0.0.1:8787",
      "/collect": "http://127.0.0.1:8787",
      "/dashboard": "http://127.0.0.1:8787",
    },
  },
});
