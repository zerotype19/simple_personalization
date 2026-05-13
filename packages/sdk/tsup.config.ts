import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

/** `.css` is handled by tsup/PostCSS and breaks our string bundle; `.txt` + this plugin inlines CSS text for the inspector fallback `<style>`. */
function inlineInspectorPanelTxt(): Plugin {
  return {
    name: "inline-inspector-panel-txt",
    setup(build) {
      build.onLoad({ filter: /inspector-panel\.txt$/ }, (args) => {
        const text = readFileSync(args.path, "utf8");
        return {
          contents: `export default ${JSON.stringify(text)};`,
          loader: "js",
        };
      });
    },
  };
}

/** Injected into `sdk.iife.js` only — enables a one-line `<script src="https://cdn/.../sdk.iife.js">` for webmasters. */
function embedDefines() {
  const workerBase = (process.env.SI_PUBLIC_WORKER_URL ?? "").replace(/\/+$/, "");
  const config =
    process.env.SI_PUBLIC_CONFIG_URL || (workerBase ? `${workerBase}/config` : "");
  const collect =
    process.env.SI_PUBLIC_COLLECT_URL || (workerBase ? `${workerBase}/collect` : "");
  const forceInspector = process.env.SI_PUBLIC_FORCE_INSPECTOR === "1";
  const inspectorCss = (process.env.SI_PUBLIC_INSPECTOR_CSS_URL ?? "").trim();
  return {
    __SI_EMBED_CONFIG_URL__: JSON.stringify(config),
    __SI_EMBED_COLLECT_URL__: JSON.stringify(collect),
    __SI_EMBED_FORCE_INSPECTOR__: forceInspector ? "true" : "false",
    __SI_EMBED_INSPECTOR_CSS_URL__: JSON.stringify(inspectorCss),
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
    define: {
      __SI_EMBED_INSPECTOR_CSS_URL__: JSON.stringify(
        (process.env.SI_PUBLIC_INSPECTOR_CSS_URL ?? "").trim(),
      ),
    },
    esbuildPlugins: [inlineInspectorPanelTxt()],
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
    esbuildPlugins: [inlineInspectorPanelTxt()],
    outExtension: () => ({ js: ".js" }),
  },
]);
