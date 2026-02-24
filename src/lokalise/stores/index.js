import { createPinia } from "pinia";

const pinia = createPinia();

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
