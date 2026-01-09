/**
 * CDN Data Parser
 * 负责解析和标准化CDN数据
 */

import { debugError } from "../../utils/debug.js";

/**
 * 解析JavaScript格式的翻译数据
 * @param {string} jsContent - JavaScript内容
 * @returns {Object} 解析后的翻译数据
 */
export function parseTranslationData(jsContent) {
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
 * 标准化文本（用于匹配）
 * @param {string} text - 原始文本
 * @returns {string} 标准化后的文本
 */
export function normalizeText(text) {
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
