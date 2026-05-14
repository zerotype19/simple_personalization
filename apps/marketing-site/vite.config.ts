import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const apiTarget = env.VITE_SI_API_DEV_PROXY ?? "http://127.0.0.1:8787";

  return {
    plugins: [react()],
    server: {
      port: 5175,
      proxy: {
        "/signup-request": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
