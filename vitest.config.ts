import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: [
      "packages/shared/src/**/*.test.ts",
      "packages/sdk/src/**/*.test.ts",
      "worker/src/**/*.test.ts",
    ],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@si/shared/contextBrain": path.resolve(
        __dirname,
        "packages/shared/src/contextBrain/index.ts",
      ),
      "@si/shared/demoMetrics": path.resolve(__dirname, "packages/shared/src/demoMetrics.ts"),
      "@si/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
});
