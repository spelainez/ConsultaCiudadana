// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const r = (p: string) => path.resolve(import.meta.dirname, p);

export default defineConfig({
  plugins: [react()],
  root: r("client"),
  resolve: {
    alias: {
      "@": r("client/src"),
      "@shared": r("shared"),
    },
  },
  server: {
    port: 8080,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true, secure: false },
              "/uploadps": { target: "http://localhost:5000", changeOrigin: true },


    },
  },
});
