import { createPinia } from "pinia";

// 创建 Pinia 实例
const pinia = createPinia();

// 导出 Pinia 实例
export default pinia;

// 导出所有 stores
export * from "./app.js";
export * from "./settings/api.js";
export * from "./settings/translation.js";
export * from "./translation/core.js";
export * from "./translation/upload.js";
export * from "./translation/export.js";
export * from "./translation/deduplicate.js";
export * from "./terms.js";
export * from "./library.js";
