import { createPinia } from "pinia";

// 创建 Pinia 实例
const pinia = createPinia();

// 导出 Pinia 实例
export default pinia;

// 导出所有 stores
export * from "./app.js";
export * from "./settings/index.js";
export * from "./translation/index.js";
export * from "./terms.js";
