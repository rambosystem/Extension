/**
 * Content script 单独构建为 IIFE，避免 content_scripts 依赖 "type": "module"
 * 参考: https://github.com/antfu-collective/vitesse-webext (vite.config.content.mts)
 */
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  define: {
    // 浏览器/content 环境没有 process，在构建时替换避免运行时报错
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    vue({
      template: {
        compilerOptions: { hoistStatic: false },
      },
    }),
  ],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/content.js"),
      name: "PenroseContent",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        entryFileNames: "content.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "content.css";
          }
          return "assets/[name]-[hash].[ext]";
        },
      },
    },
  },
});
