/**
 * CDN数据获取相关API - 支持增量更新和缓存
 */

import { debugLog, debugWarn, debugError } from "../utils/debug.js";

// CDN地址配置
const CDN_URLS = {
  AmazonSearch:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/AmazonSearch/en.js",
  Common:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/Common/en.js",
  Commerce:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/Commerce/en.js",
};

// 缓存配置
const CACHE_CONFIG = {
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
function getCacheKey(project) {
  return `${CACHE_CONFIG.CACHE_KEY_PREFIX}${project}`;
}

/**
 * 获取ETag键名
 * @param {string} project - 项目名称
 * @returns {string} ETag键名
 */
function getEtagKey(project) {
  return `${CACHE_CONFIG.ETAG_KEY_PREFIX}${project}`;
}

/**
 * 从缓存加载CDN数据
 * @param {string} project - 项目名称
 * @returns {Object|null} 缓存数据，包含 data, etag, timestamp
 */
function loadFromCache(project) {
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
function saveToCache(project, data, etag) {
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
 * 增量合并新旧翻译数据
 * @param {Object} oldData - 旧的翻译数据
 * @param {Object} newData - 新的翻译数据
 * @returns {Object} 合并后的数据
 */
function mergeTranslationData(oldData, newData) {
  const merged = { ...oldData };
  let addedCount = 0;
  let updatedCount = 0;
  let removedCount = 0;

  // 添加或更新新数据中的键
  for (const [key, value] of Object.entries(newData)) {
    if (!(key in merged)) {
      merged[key] = value;
      addedCount++;
    } else if (merged[key] !== value) {
      merged[key] = value;
      updatedCount++;
    }
  }

  // 移除旧数据中不存在的键
  const newKeys = new Set(Object.keys(newData));
  for (const key of Object.keys(merged)) {
    if (!newKeys.has(key)) {
      delete merged[key];
      removedCount++;
    }
  }

  if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
    debugLog(
      `[CDN Merge] Added: ${addedCount}, Updated: ${updatedCount}, Removed: ${removedCount}`
    );
  }

  return merged;
}

/**
 * 清除过期缓存
 */
function clearExpiredCaches() {
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
        const headers = {
          Accept: "application/javascript, text/javascript, */*",
        };

        // 如果缓存中有ETag，使用条件请求
        if (cached.etag) {
          headers["If-None-Match"] = cached.etag;
        }

        const response = await fetch(url, {
          method: "HEAD", // 只请求头信息，不下载内容
          headers,
        });

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
    const headers = {
      Accept: "application/javascript, text/javascript, */*",
    };

    // 如果启用增量更新且有缓存，添加条件请求头
    if (
      CACHE_CONFIG.ENABLE_INCREMENTAL_UPDATE &&
      cached?.etag &&
      !forceRefresh
    ) {
      headers["If-None-Match"] = cached.etag;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    // 304 Not Modified - 文件未变化
    if (response.status === 304) {
      debugLog(
        `[CDN Cache] File not modified (304), using cache for ${project}`
      );
      return cached.data;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 获取ETag（如果服务器支持）
    const etag = response.headers.get("ETag");
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
      saveToCache(project, mergedTranslations, etag);
      return mergedTranslations;
    } else {
      // 首次下载或禁用增量更新，直接保存
      saveToCache(project, newTranslations, etag);
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
 * 解析JavaScript格式的翻译数据
 * @param {string} jsContent - JavaScript内容
 * @returns {Object} 解析后的翻译数据
 */
function parseTranslationData(jsContent) {
  try {
    // 查找 var translations = { ... } 的模式
    const match = jsContent.match(/var\s+translations\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
      throw new Error("Could not find translations object in CDN data");
    }

    // 提取JavaScript对象字符串
    const objectString = match[1];

    // 使用更简单的方法：逐行解析键值对
    const translations = {};
    const lines = objectString.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (
        !trimmedLine ||
        trimmedLine.startsWith("//") ||
        trimmedLine.startsWith("/*")
      ) {
        continue;
      }

      // 匹配键值对模式: "key": "value" 或 key: "value"
      // 使用更复杂的正则表达式来处理包含引号和空格的键名
      const keyValueMatch = trimmedLine.match(
        /^["']([^"']+)["']\s*:\s*["']([^"']*(?:\\.[^"']*)*)["']\s*,?\s*$/
      );
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        let value = keyValueMatch[2];

        // 处理转义字符
        value = value
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, "\\");

        translations[key] = value;
      }
    }

    if (Object.keys(translations).length === 0) {
      throw new Error("No valid translations found in CDN data");
    }

    return translations;
  } catch (error) {
    debugError("[CDN] Failed to parse translation data:", error);
    throw new Error(`Failed to parse translation data: ${error.message}`);
  }
}

/**
 * 将JavaScript对象格式转换为JSON格式
 * @param {string} jsObjectString - JavaScript对象字符串
 * @returns {string} JSON格式字符串
 */
function convertJsObjectToJson(jsObjectString) {
  let jsonString = jsObjectString;

  // 移除注释
  jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, "");
  jsonString = jsonString.replace(/\/\/.*$/gm, "");

  // 处理JavaScript对象键名（不需要引号的键名）
  // 匹配模式：单词字符后跟冒号，但不在引号内
  jsonString = jsonString.replace(/(\w+):/g, '"$1":');

  // 处理已经带引号的键名（避免重复引号）
  jsonString = jsonString.replace(/"(\w+)":/g, '"$1":');

  // 处理单引号字符串，转换为双引号
  // 使用更复杂的正则表达式来处理嵌套引号和转义字符
  jsonString = jsonString.replace(
    /'([^'\\]*(\\.[^'\\]*)*)'/g,
    (match, content) => {
      // 转义内容中的双引号和反斜杠
      const escapedContent = content
        .replace(/\\/g, "\\\\") // 转义反斜杠
        .replace(/"/g, '\\"'); // 转义双引号
      return `"${escapedContent}"`;
    }
  );

  // 处理尾随逗号
  jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

  // 处理undefined值
  jsonString = jsonString.replace(/:\s*undefined/g, ": null");

  // 处理JavaScript的true/false/null（确保它们是有效的JSON）
  jsonString = jsonString.replace(/:\s*true\b/g, ": true");
  jsonString = jsonString.replace(/:\s*false\b/g, ": false");
  jsonString = jsonString.replace(/:\s*null\b/g, ": null");

  return jsonString;
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
 * 标准化文本（用于匹配）
 * @param {string} text - 原始文本
 * @returns {string} 标准化后的文本
 */
function normalizeText(text) {
  return text
    .replace(/\s+/g, " ") // 将多个空格替换为单个空格
    .replace(/[，,]/g, ",") // 统一逗号
    .replace(/[。.]/g, ".") // 统一句号
    .replace(/[！!]/g, "!") // 统一感叹号
    .replace(/[？?]/g, "?") // 统一问号
    .replace(/["""]/g, '"') // 统一引号
    .replace(/[''']/g, "'") // 统一单引号
    .trim();
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
