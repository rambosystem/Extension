// Content script - 划词翻译 (built by Vite, output: dist/content.js)
// 先注入 process shim，再加载 translate（Vue 等依赖 process.env）
import "./shim-process.js";
import "./translate/index.js";
