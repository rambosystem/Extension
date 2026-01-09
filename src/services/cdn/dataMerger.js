/**
 * CDN Data Merger
 * 负责增量合并新旧翻译数据
 */

import { debugLog } from "../../utils/debug.js";

/**
 * 增量合并新旧翻译数据
 * @param {Object} oldData - 旧的翻译数据
 * @param {Object} newData - 新的翻译数据
 * @returns {Object} 合并后的数据
 */
export function mergeTranslationData(oldData, newData) {
  const merged = { ...oldData };
  let addedCount = 0;
  let updatedCount = 0;
  let removedCount = 0;

  // 添加或更新新数据中的键
  for (const [key, value] of Object.entries(newData)) {
    if (!(key in merged)) {
      merged[key] = value;
      addedCount++;
    } else if (merged[key] !== value) {
      merged[key] = value;
      updatedCount++;
    }
  }

  // 移除旧数据中不存在的键
  const newKeys = new Set(Object.keys(newData));
  for (const key of Object.keys(merged)) {
    if (!newKeys.has(key)) {
      delete merged[key];
      removedCount++;
    }
  }

  if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
    debugLog(
      `[CDN Merge] Added: ${addedCount}, Updated: ${updatedCount}, Removed: ${removedCount}`
    );
  }

  return merged;
}
