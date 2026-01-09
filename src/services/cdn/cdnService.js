/**
 * CDN Service
 * 主服务函数：负责从CDN获取翻译数据
 */

import { debugLog, debugWarn, debugError } from "../../utils/debug.js";
import { CDN_URLS, checkCdnFileUpdate, fetchCdnFile } from "../../api/cdn.js";
import {
  CACHE_CONFIG,
  loadFromCache,
  saveToCache,
  getCacheKey,
  getEtagKey,
} from "./cacheManager.js";
import { parseTranslationData } from "./dataParser.js";
import { mergeTranslationData } from "./dataMerger.js";
import { normalizeText } from "./dataParser.js";

/**
 * 从CDN获取翻译数据（支持增量更新和缓存）
 * @param {string} project - 项目名称 (AmazonSearch, Common 或 Commerce)
 * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
 * @returns {Promise<Object>} 解析后的翻译数据
 */
export async function fetchCdnTranslations(project, forceRefresh = false) {
  const url = CDN_URLS[project];
  if (!url) {
    throw new Error(`Unknown project: ${project}`);
  }

  // 如果不强制刷新，先尝试从缓存加载
  if (!forceRefresh && CACHE_CONFIG.ENABLE_CACHE) {
    const cached = loadFromCache(project);
    if (cached) {
      // 使用HTTP条件请求检查是否有更新
      try {
        const response = await checkCdnFileUpdate(url, cached.etag);

        // 304 Not Modified - 文件未变化，直接使用缓存
        if (response.status === 304) {
          debugLog(
            `[CDN Cache] File not modified (304), using cache for ${project}`
          );
          return cached.data;
        }

        // 获取新的ETag
        const newEtag = response.headers.get("ETag");

        // 如果ETag相同但状态不是304，可能是服务器不支持条件请求
        // 继续下载完整文件
        if (newEtag && newEtag === cached.etag && response.status === 200) {
          debugLog(`[CDN Cache] ETag matches, using cache for ${project}`);
          return cached.data;
        }

        // ETag不同，文件已更新，需要下载新文件
        debugLog(
          `[CDN Cache] File updated (ETag changed), downloading new version for ${project}`
        );
      } catch (error) {
        // HEAD请求失败，使用缓存（网络问题）
        debugWarn(`[CDN Cache] HEAD request failed, using cache:`, error);
        return cached.data;
      }
    }
  }

  // 下载完整文件
  try {
    const cached = loadFromCache(project);
    const etag = cached?.etag || null;

    const response = await fetchCdnFile(url, etag);

    // 304 Not Modified - 文件未变化
    if (response.status === 304) {
      debugLog(
        `[CDN Cache] File not modified (304), using cache for ${project}`
      );
      return cached.data;
    }

    // 获取ETag（如果服务器支持）
    const newEtag = response.headers.get("ETag");
    const lastModified = response.headers.get("Last-Modified");

    const jsContent = await response.text();
    const newTranslations = parseTranslationData(jsContent);

    // 如果启用增量更新且有旧缓存，进行增量合并
    if (
      CACHE_CONFIG.ENABLE_INCREMENTAL_UPDATE &&
      cached?.data &&
      !forceRefresh
    ) {
      const mergedTranslations = mergeTranslationData(
        cached.data,
        newTranslations
      );
      saveToCache(project, mergedTranslations, newEtag);
      return mergedTranslations;
    } else {
      // 首次下载或禁用增量更新，直接保存
      saveToCache(project, newTranslations, newEtag);
      return newTranslations;
    }
  } catch (error) {
    debugError(`[CDN] Failed to fetch CDN data for ${project}:`, error);

    // 如果网络请求失败，尝试使用过期缓存
    const expiredCache = loadFromCache(project);
    if (expiredCache) {
      debugWarn(`[CDN Cache] Network error, using expired cache`);
      return expiredCache.data;
    }

    throw new Error(`Failed to fetch translations from CDN: ${error.message}`);
  }
}

/**
 * 强制刷新CDN数据（清除缓存并重新获取）
 * @param {string} project - 项目名称
 * @returns {Promise<Object>} 解析后的翻译数据
 */
export async function refreshCdnTranslations(project) {
  const cacheKey = getCacheKey(project);
  const etagKey = getEtagKey(project);
  localStorage.removeItem(cacheKey);
  localStorage.removeItem(etagKey);

  return fetchCdnTranslations(project, true);
}

/**
 * 提取所有英文翻译文本
 * @param {Object} translations - 翻译数据对象
 * @returns {Set<string>} 英文文本集合
 */
export function extractEnglishTexts(translations) {
  const englishTexts = new Set();

  for (const [key, value] of Object.entries(translations)) {
    if (typeof value === "string" && value.trim()) {
      // 添加原始值
      englishTexts.add(value.trim());

      // 添加标准化后的值（去除多余空格、统一标点符号）
      const normalized = normalizeText(value.trim());
      if (normalized !== value.trim()) {
        englishTexts.add(normalized);
      }
    }
  }

  return englishTexts;
}

/**
 * 检查文本是否存在于CDN数据中
 * @param {string} text - 待检查的文本
 * @param {Set<string>} cdnTexts - CDN中的文本集合
 * @returns {boolean} 是否存在
 */
export function isTextInCdn(text, cdnTexts) {
  if (!text || !text.trim()) {
    return false;
  }

  const trimmedText = text.trim();
  const normalizedText = normalizeText(trimmedText);

  return cdnTexts.has(trimmedText) || cdnTexts.has(normalizedText);
}
