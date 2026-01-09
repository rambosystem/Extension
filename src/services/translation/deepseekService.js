/**
 * DeepSeek Translation Service
 * 主服务函数：使用 DeepSeek 进行翻译
 */

import { generateTranslationPrompt } from "../../config/prompts.js";
import { callDeepSeekAPI, parseNonStreamResponse } from "../../api/deepseek.js";
import { getTranslationConfig } from "./configManager.js";
import { buildUserContent } from "./xmlBuilder.js";
import { buildRequestBody } from "./requestBuilder.js";
import { parseStreamResponse } from "./streamParser.js";

/**
 * 使用 DeepSeek 进行翻译（主服务函数）
 * @param {string} content - 要翻译的内容
 * @param {Function} onStatusUpdate - 状态更新回调（可选）
 * @param {Array} matchedTerms - 匹配的术语数组（可选）
 * @param {Function} onChunk - 流式处理时的 chunk 回调（可选）
 * @returns {Promise<string>} 翻译结果
 */
export async function translateWithDeepSeek(
  content,
  onStatusUpdate = null,
  matchedTerms = null,
  onChunk = null
) {
  // 读取配置
  const config = getTranslationConfig();

  if (!config.apiKey) {
    throw new Error("DeepSeek API key not found");
  }

  // 根据目标语言生成 Prompt
  const prompt = generateTranslationPrompt(config.targetLanguages);

  // 构建用户输入内容（包含术语和结构化输入）
  const userContent = buildUserContent(
    content,
    matchedTerms,
    config.targetLanguages
  );

  // 构建请求体
  const stream = config.streamEnabled && onChunk !== null; // 如果有 onChunk 回调且流式处理启用，则使用流式
  const requestBody = buildRequestBody(
    prompt,
    userContent,
    config.temperature,
    config.maxTokens,
    stream
  );

  // 调用 API
  const response = await callDeepSeekAPI(config.apiKey, requestBody);

  // 处理响应
  if (stream && onChunk) {
    // 流式处理
    const reader = response.body.getReader();
    return await parseStreamResponse(reader, onChunk);
  } else {
    // 非流式处理
    return await parseNonStreamResponse(response);
  }
}
