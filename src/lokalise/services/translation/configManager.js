/**
 * Translation Config Manager
 * 负责从 localStorage 与 config 读取翻译配置
 */
import { TRANSLATION_CONFIG } from "../../config/translation.js";

/**
 * 从 localStorage 与 config 读取翻译配置
 * @returns {Object} 配置对象
 */
export function getTranslationConfig() {
  const apiKey = localStorage.getItem("deepseek_api_key");
  const targetLanguages = JSON.parse(
    localStorage.getItem("target_languages") || "[]"
  );
  const temperature = TRANSLATION_CONFIG.translationTemperature;

  const maxTokensSetting = localStorage.getItem("translation_max_tokens");
  const maxTokens = maxTokensSetting ? parseInt(maxTokensSetting, 10) : 8192;

  const streamEnabled = localStorage.getItem("stream_translation") !== "false";

  return {
    apiKey,
    targetLanguages,
    temperature,
    maxTokens,
    streamEnabled,
  };
}
