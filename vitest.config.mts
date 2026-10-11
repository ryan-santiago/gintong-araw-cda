import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Unit tests for pure logic (no database, network or browser). Run with `pnpm test`.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./tests/unit/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    env: { TZ: "UTC" },
  },
})
