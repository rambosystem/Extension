/**
 * Request Builder
 * 负责构建 DeepSeek API 请求体
 */

/**
 * 构建 DeepSeek API 请求体
 * @param {string} prompt - 系统提示词
 * @param {string} userContent - 用户输入内容
 * @param {number} temperature - 温度参数
 * @param {number} maxTokens - 最大 token 数
 * @param {boolean} stream - 是否启用流式处理
 * @returns {Object} 请求体对象
 */
export function buildRequestBody(
  prompt,
  userContent,
  temperature,
  maxTokens,
  stream
) {
  return {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: temperature,
    max_tokens: maxTokens,
    response_format: { type: "text" },
    stream: stream,
  };
}
