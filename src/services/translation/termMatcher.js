/**
 * Term Matcher
 * 负责执行术语匹配逻辑
 */

import { matchTerms } from "../termMatch/termMatchService.js";
import { getTermMatchConfig } from "./termMatchConfig.js";

/**
 * 执行术语匹配
 * @param {string} content - 要匹配的内容
 * @param {Function} onStatusUpdate - 状态更新回调（可选）
 * @returns {Promise<Array|null>} 匹配的术语数组，失败返回 null
 */
export async function performTermMatching(content, onStatusUpdate) {
  try {
    // 更新状态：匹配术语中
    if (onStatusUpdate) {
      onStatusUpdate("matching_terms");
    }

    // 解析内容为文本数组
    const textLines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    // 获取配置并执行术语匹配
    const matchOptions = {
      ...getTermMatchConfig(),
      user_id: 1,
    };

    const matchedTerms = await matchTerms(textLines, matchOptions);

    // 更新状态：匹配成功，翻译中
    if (onStatusUpdate) {
      onStatusUpdate("translating");
    }

    return matchedTerms;
  } catch (error) {
    console.error("Term matching error:", error);
    // 如果术语匹配失败，继续翻译但不使用术语
    if (onStatusUpdate) {
      onStatusUpdate("translating");
    }
    return null;
  }
}
