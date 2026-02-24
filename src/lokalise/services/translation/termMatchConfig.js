/**
 * Term Match Config
 * 从 config 读取术语匹配配置（不再从 localStorage 读取）
 */
import { TRANSLATION_CONFIG } from "../../config/translation.js";

/**
 * 获取术语匹配配置
 * @returns {Object} 配置对象
 */
export function getTermMatchConfig() {
  return {
    similarity_threshold: TRANSLATION_CONFIG.similarityThreshold,
    top_k: TRANSLATION_CONFIG.topK,
    max_ngram: TRANSLATION_CONFIG.maxNGram,
  };
}
