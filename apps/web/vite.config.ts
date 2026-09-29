import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    // scripts/*.test.mjs run with node --test (see the package "test" script)
    exclude: [...configDefaults.exclude, "scripts/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
