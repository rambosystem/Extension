import { ref } from "vue";
import { searchKeysByNames } from "../../requests/deduplicate.js";

/**
 * 去重功能管理Hook
 */
export function useDeduplicate() {
  const isProcessing = ref(false);

  /**
   * 执行去重操作
   * @param {string} projectId - 项目ID
   * @param {string} textContent - 待翻译的文本内容
   * @returns {Promise<Object>} 去重结果
   */
  const deduplicateTranslation = async (projectId, textContent) => {
    if (!projectId || !projectId.trim()) {
      throw new Error("Project ID is required for deduplication");
    }

    if (!textContent?.trim()) {
      throw new Error("Text content is required for deduplication");
    }

    isProcessing.value = true;

    try {
      // 1. 分割待翻译文本，每行作为一个 key_name
      const textLines = textContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (textLines.length === 0) {
        return {
          originalCount: 0,
          duplicateCount: 0,
          remainingCount: 0,
          duplicateTexts: [],
          remainingTexts: [],
          totalFound: 0,
        };
      }

      // 2. 调用 API 搜索这些 key_names（大小写敏感）
      const searchResult = await searchKeysByNames(projectId, textLines);

      // 3. 构建已存在的 key_name 集合（从 API 返回的 results 中提取）
      const existingKeyNames = new Set();
      if (searchResult.success && Array.isArray(searchResult.results)) {
        searchResult.results.forEach((result) => {
          if (result.key_name) {
            existingKeyNames.add(result.key_name);
          }
        });
      }

      // 4. 执行去重逻辑
      const result = performDeduplication(textLines, existingKeyNames);

      return {
        ...result,
        totalFound: searchResult.total_found || 0,
      };
    } catch (error) {
      console.error("Deduplication failed:", error);
      throw error;
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * 执行去重逻辑
   * @param {Array<string>} textLines - 待翻译的文本行（作为 key_names）
   * @param {Set<string>} existingKeyNames - API 返回的已存在的 key_name 集合（大小写敏感）
   * @returns {Object} 去重结果
   */
  const performDeduplication = (textLines, existingKeyNames) => {
    const originalCount = textLines.length;
    const duplicateTexts = [];
    const remainingTexts = [];
    const seenTexts = new Set(); // 用于跟踪已处理的文本（内部去重）

    for (const text of textLines) {
      // 检查是否在输入文本中重复（内部重复）
      const isInternalDuplicate = seenTexts.has(text);

      // 检查是否在 API 返回的结果中存在（大小写敏感匹配）
      const isExistingInApi = existingKeyNames.has(text);

      // 如果文本重复（内部重复或 API 中存在），则标记为重复
      const isDuplicate = isInternalDuplicate || isExistingInApi;

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
    };
  };

  return {
    isProcessing,
    deduplicateTranslation,
  };
}
