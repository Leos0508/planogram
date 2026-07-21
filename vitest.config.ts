import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/planogram-engine/**/*.ts"],
      exclude: ["lib/planogram-engine/__tests__/**", "lib/planogram-engine/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
