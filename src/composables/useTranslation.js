import { ElMessage } from "element-plus";
import { translate } from "../requests/lokalise.js";
import { useLoading } from "./useLoading.js";

/**
 * 翻译功能Hook
 */
export function useTranslation() {
  const { loadingStates, setLoading } = useLoading({
    translation: false,
  });

  /**
   * 解析翻译结果文本为结构化数据
   * @param {string} data - API返回的文本数据
   * @returns {Array} 解析后的翻译结果数组
   */
  const parseTranslationResult = (data) => {
    const lines = data
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    console.log("Parsed lines:", lines);

    return lines.map((line, index) => {
      // 使用正则表达式来正确解析 CSV 格式，处理包含逗号的字段
      const matches = line.match(/"([^"]*)","([^"]*)","([^"]*)"/);
      if (matches) {
        const [, en, cn, jp] = matches;
        console.log(`Line ${index + 1}:`, { en, cn, jp });
        return {
          en,
          cn,
          jp,
          editing_en: false,
          editing_cn: false,
          editing_jp: false,
        };
      } else {
        // 如果正则匹配失败，尝试简单的 split 方法
        const parts = line
          .split(",")
          .map((part) => part.replace(/"/g, "").trim());
        console.log(`Line ${index + 1} (fallback):`, parts);
        return {
          en: parts[0] || "",
          cn: parts[1] || "",
          jp: parts[2] || "",
          editing_en: false,
          editing_cn: false,
          editing_jp: false,
        };
      }
    });
  };

  /**
   * 执行翻译
   * @param {string} content - 需要翻译的内容
   * @returns {Promise<Array>} 翻译结果数组
   */
  const performTranslation = async (content) => {
    if (!content?.trim()) {
      throw new Error("Please Enter the EN Copywriting");
    }

    setLoading("translation", true);
    try {
      const data = await translate(content);
      console.log("Raw API response:", data);

      const translationResult = parseTranslationResult(data);
      console.log("Final translation result:", translationResult);

      ElMessage.success("Translation completed successfully");
      return translationResult;
    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage =
        error.message ||
        "Translation failed. Please check your API key and settings.";
      ElMessage.error(errorMessage);
      throw error;
    } finally {
      setLoading("translation", false);
    }
  };

  /**
   * 从翻译结果中提取纯数据（不包含编辑状态）
   * @param {Array} translationResult - 包含编辑状态的翻译结果
   * @returns {Array} 纯翻译数据
   */
  const extractTranslationData = (translationResult) => {
    return translationResult.map((row) => ({
      en: row.en,
      cn: row.cn,
      jp: row.jp,
    }));
  };

  return {
    loadingStates,
    performTranslation,
    extractTranslationData,
  };
}
