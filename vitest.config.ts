import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next injects `server-only`; vitest has no bundler to resolve it, so
      // server modules would die on import. See the stub for why this is safe.
      "server-only": path.resolve(__dirname, "src/lib/hub/__tests__/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
