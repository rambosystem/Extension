/**
 * 豆包 V3 TTS 流式响应解析（供 background service worker 调用）
 */

/** 语速：V3 speech_rate [-50,100]，0=1x；speedRatio 0.5~2 映射过去 */
export function toSpeechRate(speedRatio) {
  const r = Number(speedRatio) || 1;
  return Math.max(-50, Math.min(100, Math.round((r - 1) * 100)));
}

/** 从单条 JSON 中取 base64 音频（兼容 data / audio 等字段） */
export function getB64FromJson(json) {
  const raw = json.data ?? json.audio ?? json.audio_data;
  if (typeof raw === "string") return raw;
  return null;
}

/**
 * 解析 V3 流式响应：整段读取后按行解析 NDJSON，或单条 JSON
 * @param {Response} res - fetch Response（非 null body）
 * @param {string} encoding - 音频编码（例 "mp3"）
 * @returns {Promise<{ok: boolean, audioBase64?: string, encoding?: string, error?: string}>}
 */
export async function readV3Stream(res, encoding) {
  const text = await res.text();
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  for (const line of lines) {
    try {
      const json = JSON.parse(line);
      if (json.code === 20000000) {
        const b64 = chunks.join("");
        return b64
          ? { ok: true, audioBase64: b64, encoding }
          : { ok: false, error: "no audio in stream" };
      }
      if (json.code != null && json.code !== 0 && json.code !== 20000000) {
        return { ok: false, error: json.message || `code ${json.code}` };
      }
      const b64 = getB64FromJson(json);
      if (b64) chunks.push(b64);
    } catch (_) {}
  }
  const b64 = chunks.join("");
  if (b64) return { ok: true, audioBase64: b64, encoding };
  try {
    const single = JSON.parse(text.trim());
    const one = getB64FromJson(single);
    if (one) return { ok: true, audioBase64: one, encoding };
    if (single.code && single.code !== 0)
      return { ok: false, error: single.message || `code ${single.code}` };
  } catch (_) {}
  return { ok: false, error: "no audio in stream" };
}
