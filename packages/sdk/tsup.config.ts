import { defineConfig } from "tsup";

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
    outExtension: () => ({ js: ".js" }),
    footer: {
      js: "window.SessionIntelBundle && window.SessionIntelBundle.bootFromScriptTag && window.SessionIntelBundle.bootFromScriptTag();",
    },
  },
]);
