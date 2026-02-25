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
