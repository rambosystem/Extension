/**
 * Translate Service - 划词翻译（单词查词）
 * 调用 DeepSeek 获取单词释义：音标 + 条目列表 [词性, 释义, 例句原文, 例句中文]
 * 运行在 content script 中，需从 chrome.storage.local 读取 API key（无法访问扩展页的 localStorage）
 */

import { callDeepSeekAPI, parseNonStreamResponse } from "../../../api/deepseek.js";
import { buildRequestBody } from "../../../services/translation/requestBuilder.js";
import { TRANSLATE_WORD_PROMPT } from "../../config/prompts.js";

/**
 * 从 chrome.storage.local 读取划词翻译所需配置（content script 环境）
 * @returns {Promise<{ apiKey: string, temperature: number, maxTokens: number }>}
 */
function getTranslateConfig() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve({ apiKey: "", temperature: 0.1, maxTokens: 8192 });
      return;
    }
    chrome.storage.local.get(
      ["deepseek_api_key", "translation_temperature", "translation_max_tokens"],
      (items) => {
        const temperature = items.translation_temperature != null
          ? parseFloat(items.translation_temperature)
          : 0.1;
        const maxTokens = items.translation_max_tokens != null
          ? parseInt(items.translation_max_tokens, 10)
          : 8192;
        resolve({
          apiKey: items.deepseek_api_key || "",
          temperature,
          maxTokens,
        });
      }
    );
  });
}

/**
 * 从 API 返回的 content 中解析 JSON（兼容被 markdown 代码块包裹的情况）
 * @param {string} content
 * @returns {Object}
 */
function parseWordResultContent(content) {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(trimmed);
}

/**
 * 调用 DeepSeek 查询单词释义
 * @param {string} word - 待查单词
 * @returns {Promise<{ pronunciation: string, entries: Array<{ part_of_speech: string, meaning: string, example: string, example_translation: string }> }>}
 */
export async function translateWord(word) {
  const config = await getTranslateConfig();
  if (!config?.apiKey?.trim()) {
    throw new Error("DeepSeek API key not found. Please set it in extension options.");
  }
  const requestBody = buildRequestBody(
    TRANSLATE_WORD_PROMPT,
    word,
    config.temperature ?? 0.1,
    config.maxTokens ?? 8192,
    false
  );
  const response = await callDeepSeekAPI(config.apiKey, requestBody);
  const content = await parseNonStreamResponse(response);
  const data = parseWordResultContent(content);
  if (!data || typeof data.pronunciation !== "string" || !Array.isArray(data.entries)) {
    throw new Error("Invalid word result format from API");
  }
  return data;
}
