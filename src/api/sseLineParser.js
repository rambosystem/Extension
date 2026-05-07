/**
 * OpenAI 兼容 SSE 行解析工具
 * DeepSeek / OpenAI 风格的流式响应：每行形如 `data: {...json...}` 或 `data: [DONE]`
 */

/**
 * 解析一行 SSE 数据
 * @param {string} line - 单行文本
 * @returns {{done: boolean, content: string, finishReason: string|null, usage: Object|null, data: Object|null}}
 *  - done: 遇到 `data: [DONE]`
 *  - content: delta.content 或 message.content（如果存在）
 *  - finishReason: choices[0].finish_reason（如果存在）
 *  - usage: json.usage（如果存在）
 *  - data: 解析后的整个 JSON 对象（如果可解析）
 */
export function parseSSELine(line) {
  const empty = {
    done: false,
    content: "",
    finishReason: null,
    usage: null,
    data: null,
  };
  const s = (line || "").trim();
  if (!s) return empty;
  if (!s.startsWith("data:")) return empty;
  const payload = s.slice(5).trim();
  if (!payload) return empty;
  if (payload === "[DONE]") return { ...empty, done: true };
  try {
    const data = JSON.parse(payload);
    const choice = data?.choices?.[0];
    const deltaContent = choice?.delta?.content;
    const messageContent = choice?.message?.content;
    const content =
      typeof deltaContent === "string"
        ? deltaContent
        : typeof messageContent === "string"
          ? messageContent
          : "";
    return {
      done: false,
      content,
      finishReason: choice?.finish_reason ?? null,
      usage: data?.usage ?? null,
      data,
    };
  } catch (_) {
    return empty;
  }
}
