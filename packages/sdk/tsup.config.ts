import { defineConfig } from "tsup";

/** Injected into `sdk.iife.js` only — enables a one-line `<script src="https://cdn/.../sdk.iife.js">` for webmasters. */
function embedDefines() {
  const workerBase = (process.env.SI_PUBLIC_WORKER_URL ?? "").replace(/\/+$/, "");
  const config =
    process.env.SI_PUBLIC_CONFIG_URL || (workerBase ? `${workerBase}/config` : "");
  const collect =
    process.env.SI_PUBLIC_COLLECT_URL || (workerBase ? `${workerBase}/collect` : "");
  const forceInspector = process.env.SI_PUBLIC_FORCE_INSPECTOR === "1";
  return {
    __SI_EMBED_CONFIG_URL__: JSON.stringify(config),
    __SI_EMBED_COLLECT_URL__: JSON.stringify(collect),
    __SI_EMBED_FORCE_INSPECTOR__: forceInspector ? "true" : "false",
  } as Record<string, string>;
}

export default defineConfig([
  {
    entry: { sdk: "src/index.ts" },
    format: ["esm"],
    target: "es2020",
    sourcemap: true,
    minify: true,
    dts: true,
    clean: true,
    outDir: "dist",
    platform: "browser",
    splitting: false,
    treeshake: true,
  },
  {
    entry: { "sdk.iife": "src/iife.ts" },
    format: ["iife"],
    globalName: "SessionIntelBundle",
    target: "es2020",
    sourcemap: true,
    minify: true,
    dts: false,
    clean: false,
    outDir: "dist",
    platform: "browser",
    splitting: false,
    treeshake: true,
    define: embedDefines(),
    outExtension: () => ({ js: ".js" }),
    footer: {
      js: "window.SessionIntelBundle && window.SessionIntelBundle.bootFromScriptTag && window.SessionIntelBundle.bootFromScriptTag();",
    },
  },
]);
