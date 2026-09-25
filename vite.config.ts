import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxies the live Hormuz API so the home map works locally without CORS.
// Production calls https://hormuz.stevenstills.com/api directly (see src/lib/hormuz.ts).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/hormuz-api": {
        target: "https://hormuz.stevenstills.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/hormuz-api/, "/api"),
      },
    },
  },
  build: { outDir: "dist" },
});
