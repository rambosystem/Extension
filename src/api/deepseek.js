/**
 * DeepSeek API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

import { debugLog } from "../utils/debug.js";

const DEEPSEEK_API_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * 发送 DeepSeek API 请求
 * @param {string} apiKey - API 密钥
 * @param {Object} requestBody - 请求体
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function callDeepSeekAPI(apiKey, requestBody) {
  debugLog("DeepSeek API request body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(DEEPSEEK_API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}. ${
        errorData.error?.message || ""
      }`
    );
  }

  return response;
}

/**
 * 处理非流式响应
 * @param {Response} response - Fetch Response 对象
 * @returns {Promise<string>} 翻译内容
 */
export async function parseNonStreamResponse(response) {
  const data = await response.json();
  debugLog("DeepSeek non-stream response:", JSON.stringify(data, null, 2));

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response format from API");
  }

  return data.choices[0].message.content;
}

/**
 * 流式响应：逐块产出 content（OpenAI 兼容 SSE）
 * @param {Response} response - Fetch Response 对象（stream: true）
 * @returns {AsyncGenerator<string>}
 */
export async function* streamDeepSeekContent(response) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s || s === "data: [DONE]") continue;
      if (!s.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(s.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) yield content;
      } catch (_) {}
    }
  }
  if (buffer.trim()) {
    const s = buffer.trim();
    if (s.startsWith("data: ") && s !== "data: [DONE]") {
      try {
        const data = JSON.parse(s.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) yield content;
      } catch (_) {}
    }
  }
}
