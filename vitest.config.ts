import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so unit/integration tests don't boot vinext or workerd.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
  },
});
