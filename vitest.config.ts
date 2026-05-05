import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  },
  resolve: {
    alias: {
      "@ari/schemas": "/Users/hunterschep/ari/packages/schemas/src/index.ts",
      "@ari/shared": "/Users/hunterschep/ari/packages/shared/src/index.ts",
      "@ari/agents": "/Users/hunterschep/ari/packages/agents/src/index.ts",
      "@ari/config": "/Users/hunterschep/ari/packages/config/src/index.ts",
      "@ari/logger": "/Users/hunterschep/ari/packages/logger/src/index.ts"
    }
  }
});
