import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@si/shared": path.resolve(rootDir, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/dashboard": "http://127.0.0.1:8787",
      "/collect": "http://127.0.0.1:8787",
      "/config": "http://127.0.0.1:8787",
    },
  },
});
