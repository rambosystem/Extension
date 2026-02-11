import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// TypeScript support

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 禁用 Vue 3 的 export helper
          hoistStatic: false,
        },
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // 使用现代编译器API，解决Sass弃用警告
      },
    },
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 10240,
    chunkSizeWarningLimit: 1000, // 提高chunk大小警告限制
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/main.js"),
        options: resolve(__dirname, "src/options.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith(".css")) {
            return "[name].css";
          }
          return "assets/[name]-[hash].[ext]";
        },
        // 手动分块，优化大文件
        manualChunks: {
          "vue-vendor": ["vue"],
          "element-plus": ["element-plus", "@element-plus/icons-vue"],
          codemirror: [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
            "@codemirror/lang-javascript",
          ],
          utils: ["xlsx"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
