/**
 * Stream Parser
 * 负责处理流式响应，解析 SSE 数据
 *
 * 底层 SSE 行解析统一使用 src/api/sseLineParser.js 的 parseSSELine
 */

import { debugLog } from "@/utils/debug.js";
import { parseSSELine } from "@/api/sseLineParser.js";

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
  let buffer = "";

  const handleLine = (line) => {
    const parsed = parseSSELine(line);
    if (parsed.done) return;
    if (parsed.finishReason) {
      finishReason = parsed.finishReason;
      tokenUsage = parsed.usage;
    }
    if (parsed.content) {
      fullContent += parsed.content;
      onChunk(parsed.content, fullContent);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          handleLine(buffer.trim());
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        handleLine(line);
      }
    }

    debugLog("DeepSeek streaming response completed:", fullContent);
    debugLog("Finish reason:", finishReason);
    debugLog("Token usage:", tokenUsage);

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
