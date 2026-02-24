/**
 * CDN Service Index
 * 统一导出CDN服务的所有公共API
 */

// 主服务函数
export {
  fetchCdnTranslations,
  refreshCdnTranslations,
  extractEnglishTexts,
  isTextInCdn,
} from "./cdnService.js";

// 缓存管理
export {
  getCacheStats,
  clearCache,
  clearAllCaches,
  CACHE_CONFIG,
} from "./cacheManager.js";
