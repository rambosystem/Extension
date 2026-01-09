/**
 * Translation Service Index
 * 统一导出翻译服务的所有公共API
 */

// DeepSeek 翻译服务
export { translateWithDeepSeek } from "./deepseekService.js";

// Lokalise 服务
export {
  translate,
  getUserProjects,
  uploadTranslationKeys,
  createTranslationKey,
} from "./lokaliseService.js";
