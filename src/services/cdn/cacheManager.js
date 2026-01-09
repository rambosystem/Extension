/**
 * CDN Cache Manager
 * 负责缓存管理相关的功能：加载、保存、清除缓存等
 */

import { debugError } from "../../utils/debug.js";
import { CDN_URLS } from "../../api/cdn.js";

// 缓存配置
export const CACHE_CONFIG = {
  // 缓存过期时间（毫秒）- 默认24小时
  EXPIRY_TIME: 24 * 60 * 60 * 1000,
  // 缓存键前缀
  CACHE_KEY_PREFIX: "cdn_cache_",
  // ETag键前缀
  ETAG_KEY_PREFIX: "cdn_etag_",
  // 是否启用缓存
  ENABLE_CACHE: true,
  // 是否启用增量更新
  ENABLE_INCREMENTAL_UPDATE: true,
};

/**
 * 获取缓存键名
 * @param {string} project - 项目名称
 * @returns {string} 缓存键名
 */
export function getCacheKey(project) {
  return `${CACHE_CONFIG.CACHE_KEY_PREFIX}${project}`;
}

/**
 * 获取ETag键名
 * @param {string} project - 项目名称
 * @returns {string} ETag键名
 */
export function getEtagKey(project) {
  return `${CACHE_CONFIG.ETAG_KEY_PREFIX}${project}`;
}

/**
 * 从缓存加载CDN数据
 * @param {string} project - 项目名称
 * @returns {Object|null} 缓存数据，包含 data, etag, timestamp
 */
export function loadFromCache(project) {
  if (!CACHE_CONFIG.ENABLE_CACHE) return null;

  try {
    const cacheKey = getCacheKey(project);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const now = Date.now();

    // 检查是否过期
    if (now - cacheData.timestamp > CACHE_CONFIG.EXPIRY_TIME) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(getEtagKey(project));
      return null;
    }

    return {
      data: cacheData.data,
      etag: cacheData.etag,
      timestamp: cacheData.timestamp,
    };
  } catch (error) {
    debugError("[CDN Cache] Failed to load cache:", error);
    return null;
  }
}

/**
 * 保存CDN数据到缓存
 * @param {string} project - 项目名称
 * @param {Object} data - 翻译数据
 * @param {string|null} etag - ETag值
 */
export function saveToCache(project, data, etag) {
  if (!CACHE_CONFIG.ENABLE_CACHE) return;

  try {
    const cacheKey = getCacheKey(project);
    const cacheData = {
      data,
      etag: etag || null,
      timestamp: Date.now(),
      url: CDN_URLS[project],
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    // 单独保存ETag用于快速检查
    if (etag) {
      localStorage.setItem(getEtagKey(project), etag);
    }
  } catch (error) {
    debugError("[CDN Cache] Failed to save cache:", error);
    // 如果存储空间不足，尝试清理过期缓存
    clearExpiredCaches();
    // 重试一次
    try {
      localStorage.setItem(
        getCacheKey(project),
        JSON.stringify({
          data,
          etag: etag || null,
          timestamp: Date.now(),
          url: CDN_URLS[project],
        })
      );
    } catch (retryError) {
      debugError("[CDN Cache] Failed to save cache after cleanup:", retryError);
    }
  }
}

/**
 * 清除过期缓存
 */
export function clearExpiredCaches() {
  const now = Date.now();
  Object.keys(CDN_URLS).forEach((project) => {
    const cacheKey = getCacheKey(project);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        if (now - cacheData.timestamp > CACHE_CONFIG.EXPIRY_TIME) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(getEtagKey(project));
        }
      }
    } catch (error) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(getEtagKey(project));
    }
  });
}

/**
 * 清除指定项目的缓存
 * @param {string} project - 项目名称
 */
export function clearCache(project) {
  const cacheKey = getCacheKey(project);
  const etagKey = getEtagKey(project);
  localStorage.removeItem(cacheKey);
  localStorage.removeItem(etagKey);
}

/**
 * 清除所有CDN缓存
 */
export function clearAllCaches() {
  Object.keys(CDN_URLS).forEach((project) => {
    clearCache(project);
  });
}

/**
 * 获取缓存统计信息
 * @param {string} project - 项目名称
 * @returns {Object|null} 缓存统计信息
 */
export function getCacheStats(project) {
  const cached = loadFromCache(project);
  if (!cached) {
    return null;
  }

  return {
    project,
    keysCount: Object.keys(cached.data).length,
    cacheTime: new Date(cached.timestamp).toISOString(),
    age: Date.now() - cached.timestamp,
    ageHours: Math.floor((Date.now() - cached.timestamp) / (60 * 60 * 1000)),
    etag: cached.etag,
  };
}
