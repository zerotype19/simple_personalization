import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const devAccessEmail = env.VITE_SI_DEV_ACCESS_EMAIL || "viewer@optiview.local";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@si/shared/contextBrain": path.resolve(
          rootDir,
          "../../packages/shared/src/contextBrain/index.ts",
        ),
        "@si/shared": path.resolve(rootDir, "../../packages/shared/src/index.ts"),
      },
    },
    server: {
      port: 5174,
      proxy: {
        "/dashboard": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
          configure(proxy) {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("X-SI-Dev-Access-Email", devAccessEmail);
            });
          },
        },
        "/collect": "http://127.0.0.1:8787",
        "/config": "http://127.0.0.1:8787",
      },
    },
  };
});
