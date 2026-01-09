/**
 * Translation Service Index
 * 统一导出翻译服务的所有公共API
 */

// DeepSeek 翻译服务
export { translateWithDeepSeek as translateByAI } from "./deepseekService.js";

// Lokalise 服务
export {
  translate as translateByHuman,
  getUserProjects,
  uploadTranslationKeys,
  createTranslationKey,
} from "./lokaliseService.js";
