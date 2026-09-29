import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": a new version waits until the person taps "update" (never reloads mid-entry).
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["offline.html", "icons/favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        // Placeholder identity until D-01 (product name) is decided.
        name: "SMS",
        short_name: "SMS",
        description: "School management on your phone",
        lang: "bn",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0F6E51",
        background_color: "#FFFFFF",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell: JS, CSS, HTML, fonts and icons are precached. Data is never cached here
        // (online-first, D-06); the offline queue is a separate task (M0-S2).
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/offline\.html$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: false,
    // scripts/*.test.mjs run with node --test (see the package "test" script)
    exclude: [...configDefaults.exclude, "scripts/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
