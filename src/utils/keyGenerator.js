/**
 * Key生成工具
 * 简化版本：仅按顺序生成key，不检查唯一性
 */

/**
 * 解析key格式（如 "key1" -> {prefix: "key", number: 1}）
 * @param {string} key - key字符串
 * @returns {{prefix: string, number: number}|null}
 */
export function parseKey(key) {
  if (!key || typeof key !== "string") return null;
  const match = key.trim().match(/^([a-zA-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    number: parseInt(match[2], 10),
  };
}

/**
 * 为翻译结果数组生成key（简化版本：仅按顺序生成）
 * @param {Array} translationResult - 翻译结果数组
 * @param {string} baselineKey - 基准key（如 "key1"）
 * @param {number} startIndex - 起始索引（用于继续翻译场景）
 * @returns {Array} 添加了key的翻译结果数组
 */
export function generateKeysForTranslationResult(
  translationResult,
  baselineKey,
  startIndex = 0
) {
  if (!Array.isArray(translationResult) || translationResult.length === 0) {
    return translationResult;
  }

  if (!baselineKey || !baselineKey.trim()) {
    return translationResult;
  }

  // 解析baseline key
  const parsed = parseKey(baselineKey.trim());
  if (!parsed) {
    // 如果格式不正确，使用默认格式
    return translationResult.map((item, index) => ({
      ...item,
      key: `key${startIndex + index + 1}`,
    }));
  }

  const { prefix, number: baselineNumber } = parsed;

  // 按顺序生成key：baselineNumber + startIndex, baselineNumber + startIndex + 1, ...
  return translationResult.map((item, index) => {
    const keyNumber = baselineNumber + startIndex + index;
    return {
      ...item,
      key: `${prefix}${keyNumber}`,
    };
  });
}
