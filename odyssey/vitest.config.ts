import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Pure-function suites only (P0-T5). No jsdom, no component mounting:
    // every target here is a pure function, and a DOM environment would only
    // make these slower and more fragile.
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Co-located with the source they cover, next to the Next.js alias config.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
