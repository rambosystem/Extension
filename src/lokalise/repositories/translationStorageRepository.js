/**
 * translationStorageRepository.js - 翻译存储仓储层
 * 翻译相关配置与上次翻译结果的读写收口，统一通过 storage 适配层访问
 */

import { STORAGE_KEYS } from "../config/storageKeys.js";
import { getLocalItem, setLocalItem } from "../infrastructure/storage.js";

/**
 * 保存最近一次翻译结果
 * @param {Object} payload - 翻译结果数据
 * @returns {boolean}
 */
export function saveLastTranslation(payload) {
  return setLocalItem(STORAGE_KEYS.LAST_TRANSLATION, payload);
}

/**
 * 加载最近一次翻译结果
 * @returns {Object|null}
 */
export function loadLastTranslation() {
  const stored = getLocalItem(STORAGE_KEYS.LAST_TRANSLATION);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse stored last translation:", error);
    return null;
  }
}

/**
 * 获取 DeepSeek API 密钥
 * @returns {string}
 */
export function getDeepSeekApiKey() {
  return getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY, "");
}

/**
 * 是否启用自动去重
 * @returns {boolean}
 */
export function isAutoDeduplicationEnabled() {
  return getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED) === "true";
}

/**
 * 获取自动去重开关的原始存储值（未转 boolean）
 * @returns {string|null}
 */
export function getAutoDeduplicationRawValue() {
  return getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED);
}

/**
 * 获取用户选择的目标语言列表
 * @returns {string[]}
 */
export function getTargetLanguages() {
  const raw = getLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, "[]");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse target languages from storage:", error);
    return [];
  }
}

/**
 * 是否在截断时自动继续（流式/长文场景）
 * @returns {boolean}
 */
export function shouldAutoContinueOnTruncate() {
  return getLocalItem(STORAGE_KEYS.AUTO_CONTINUE_ON_TRUNCATE) !== "false";
}
