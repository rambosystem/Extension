/**
 * Service Worker（background.js）单独构建为 IIFE，避免 manifest V3 service_worker 依赖 "type": "module"
 * 参考: vite.config.content.js
 */
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/background/index.js"),
      name: "PenroseBackground",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        entryFileNames: "background.js",
      },
    },
  },
});
