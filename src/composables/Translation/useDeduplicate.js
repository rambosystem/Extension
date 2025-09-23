import { ref } from "vue";
import { ElMessage } from "element-plus";
import {
  fetchCdnTranslations,
  extractEnglishTexts,
  isTextInCdn,
} from "../../requests/cdn.js";
import { useI18n } from "../Core/useI18n.js";

const { t } = useI18n();

/**
 * 去重功能管理Hook
 */
export function useDeduplicate() {
  const isProcessing = ref(false);

  /**
   * 执行去重操作
   * @param {string} project - 项目名称
   * @param {string} textContent - 待翻译的文本内容
   * @returns {Promise<Object>} 去重结果
   */
  const deduplicateTranslation = async (project, textContent) => {
    if (!project || !textContent?.trim()) {
      throw new Error("Invalid parameters for deduplication");
    }

    isProcessing.value = true;

    try {
      // 1. 获取CDN翻译数据
      const translations = await fetchCdnTranslations(project);

      // 2. 提取所有英文文本
      const cdnTexts = extractEnglishTexts(translations);

      // 3. 分割待翻译文本
      const textLines = textContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // 4. 执行去重
      const result = performDeduplication(textLines, cdnTexts);

      return result;
    } catch (error) {
      console.error("Deduplication failed:", error);
      throw error;
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * 执行去重逻辑
   * @param {Array<string>} textLines - 待翻译的文本行
   * @param {Set<string>} cdnTexts - CDN中的文本集合
   * @returns {Object} 去重结果
   */
  const performDeduplication = (textLines, cdnTexts) => {
    const originalCount = textLines.length;
    const duplicateTexts = [];
    const remainingTexts = [];
    const seenTexts = new Set(); // 用于跟踪已处理的文本

    for (const text of textLines) {
      // 检查是否在输入文本中重复（内部重复）
      const isInternalDuplicate = seenTexts.has(text);

      // 检查是否在CDN中重复
      const isCdnDuplicate = isTextInCdn(text, cdnTexts);

      // 如果文本重复（内部重复或CDN重复），则标记为重复
      const isDuplicate = isInternalDuplicate || isCdnDuplicate;

      if (isDuplicate) {
        duplicateTexts.push(text);
      } else {
        remainingTexts.push(text);
        seenTexts.add(text); // 将唯一文本添加到已见集合中
      }
    }

    return {
      originalCount,
      duplicateCount: duplicateTexts.length,
      remainingCount: remainingTexts.length,
      duplicateTexts,
      remainingTexts,
      cdnTextCount: cdnTexts.size,
    };
  };

  /**
   * 获取CDN数据统计信息
   * @param {string} project - 项目名称
   * @returns {Promise<Object>} CDN数据统计
   */
  const getCdnStats = async (project) => {
    try {
      const translations = await fetchCdnTranslations(project);
      const cdnTexts = extractEnglishTexts(translations);

      return {
        project,
        totalKeys: Object.keys(translations).length,
        totalTexts: cdnTexts.size,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to get CDN stats:", error);
      throw error;
    }
  };

  return {
    isProcessing,
    deduplicateTranslation,
    getCdnStats,
  };
}
