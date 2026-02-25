/**
 * stores/index.js - Pinia 实例与持久化插件
 * 创建 Pinia 并接入 pinia-plugin-persistedstate，各 store 通过 persist 配置统一使用 storage 适配层
 */

import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export default pinia;

export * from "./app.js";
export * from "./settings/api.js";
export * from "./settings/translation.js";
export * from "./translation/core.js";
export * from "./upload.js";
export * from "./translation/export.js";
export * from "./translation/deduplicate.js";
export * from "./terms.js";
export * from "./library.js";
