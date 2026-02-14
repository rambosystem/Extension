/**
 * Translate Service - 划词翻译（单词查词）
 * 调用 DeepSeek 获取单词释义：音标 + 条目列表 [词性, 释义, 例句原文, 例句中文]
 * 支持流式返回，运行在 content script 中，需从 chrome.storage.local 读取 API key
 */

import { callDeepSeekAPI, parseNonStreamResponse, streamDeepSeekContent } from "../../../api/deepseek.js";
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
export function parseWordResultContent(content) {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(trimmed);
}

/** 条目结构校验 */
function isValidEntry(e) {
  return (
    e &&
    typeof e.part_of_speech === "string" &&
    typeof e.meaning === "string" &&
    typeof e.example === "string" &&
    typeof e.example_translation === "string"
  );
}

/**
 * 从流式 buffer 中增量解析已完整的内容（用于一行一行展示）
 * @param {string} buffer - 当前已接收的 JSON 片段
 * @returns {{ pronunciation: string|null, entries: Array }}
 */
export function parsePartialWordResult(buffer) {
  const out = { pronunciation: null, entries: [] };
  const s = buffer.trim();
  if (!s.startsWith("{")) return out;
  const pronMatch = s.match(/"pronunciation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (pronMatch) out.pronunciation = pronMatch[1].replace(/\\"/g, '"');
  const entriesStart = s.indexOf('"entries"');
  if (entriesStart === -1) return out;
  const arrStart = s.indexOf("[", entriesStart);
  if (arrStart === -1) return out;
  let depth = 0;
  let start = -1;
  for (let i = arrStart; i < s.length; i++) {
    const c = s[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) break;
    } else if (c === "{") {
      if (depth === 1) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 1 && start !== -1) {
        try {
          const obj = JSON.parse(s.slice(start, i + 1));
          if (isValidEntry(obj)) out.entries.push(obj);
        } catch (_) {}
        start = -1;
      }
    }
  }
  return out;
}

/**
 * 调用 DeepSeek 查询单词释义（非流式，一次返回）
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

/**
 * 流式查询单词释义：逐块产出 content 字符串，调用方拼接后自行解析 JSON
 * @param {string} word - 待查单词
 * @returns {AsyncGenerator<string>}
 */
export async function* translateWordStream(word) {
  const config = await getTranslateConfig();
  if (!config?.apiKey?.trim()) {
    throw new Error("DeepSeek API key not found. Please set it in extension options.");
  }
  const requestBody = buildRequestBody(
    TRANSLATE_WORD_PROMPT,
    word,
    config.temperature ?? 0.1,
    config.maxTokens ?? 8192,
    true
  );
  const response = await callDeepSeekAPI(config.apiKey, requestBody);
  yield* streamDeepSeekContent(response);
}
