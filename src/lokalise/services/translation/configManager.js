/**
 * Translation Config Manager
 * 负责从 localStorage 与 config 读取翻译配置
 */
import { TRANSLATION_CONFIG } from "../../config/translation.js";
import { STORAGE_KEYS } from "../../config/storageKeys.js";
import { getLocalItem } from "../../infrastructure/storage.js";

/**
 * 从 localStorage 与 config 读取翻译配置
 * @returns {Object} 配置对象
 */
export function getTranslationConfig() {
  const apiKey = getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY);
  const targetLanguages = JSON.parse(
    getLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, "[]")
  );
  const temperature = TRANSLATION_CONFIG.translationTemperature;

  const maxTokensSetting = getLocalItem(STORAGE_KEYS.TRANSLATION_MAX_TOKENS);
  const maxTokens = maxTokensSetting ? parseInt(maxTokensSetting, 10) : 8192;

  const streamEnabled = getLocalItem(STORAGE_KEYS.STREAM_TRANSLATION) !== "false";

  return {
    apiKey,
    targetLanguages,
    temperature,
    maxTokens,
    streamEnabled,
  };
}
