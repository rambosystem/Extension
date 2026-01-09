/**
 * Stream Parser
 * 负责处理流式响应，解析 SSE 数据
 */

import { debugLog } from "../../utils/debug.js";

/**
 * 处理流式响应，解析 SSE 数据
 * @param {ReadableStreamDefaultReader} reader - 流读取器
 * @param {Function} onChunk - 每收到一个 chunk 时的回调函数 (delta, fullContent)
 * @returns {Promise<{content: string, isTruncated: boolean}>} 完整的翻译内容和截断标记
 */
export async function parseStreamResponse(reader, onChunk) {
  let fullContent = "";
  let finishReason = null;
  let tokenUsage = null;
  const decoder = new TextDecoder();
  // Buffer 用于累积不完整的行，防止跨 chunk 的 JSON 数据被错误分割
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // 处理最后剩余的 buffer 内容
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data !== "[DONE]") {
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;

                if (json.choices?.[0]?.finish_reason) {
                  finishReason = json.choices[0].finish_reason;
                  tokenUsage = json.usage || null;
                }

                if (delta) {
                  fullContent += delta;
                  onChunk(delta, fullContent);
                }
              } catch (e) {
                debugLog("Failed to parse final SSE data:", e, line);
              }
            }
          }
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      // 将新 chunk 追加到 buffer
      buffer += chunk;

      // 按换行符分割，但保留最后一行（可能不完整）在 buffer 中
      const lines = buffer.split("\n");
      // 最后一行可能不完整，保留在 buffer 中等待下一个 chunk
      buffer = lines.pop() || "";

      // 处理所有完整的行
      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            continue;
          }

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;

            // 检查是否有finish_reason（表示流结束）
            if (json.choices?.[0]?.finish_reason) {
              finishReason = json.choices[0].finish_reason;
              tokenUsage = json.usage || null;
            }

            if (delta) {
              fullContent += delta;
              // 调用回调函数传递增量内容
              onChunk(delta, fullContent);
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
            debugLog("Failed to parse SSE data:", e, line);
          }
        }
      }
    }

    debugLog("DeepSeek streaming response completed:", fullContent);
    debugLog("Finish reason:", finishReason);
    debugLog("Token usage:", tokenUsage);

    // 如果因为token限制而停止，标记为截断
    const isTruncated = finishReason === "length";
    if (isTruncated) {
      debugLog("Warning: Translation stopped due to token limit");
    }

    return {
      content: fullContent,
      isTruncated: isTruncated,
    };
  } finally {
    reader.releaseLock();
  }
}
