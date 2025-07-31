import { ElMessage } from "element-plus";
import { translate } from "../requests/lokalise.js";
import { useState } from "./useState.js";
import { useI18n } from "./useI18n.js";
import { ref } from "vue";

const { t } = useI18n();

/**
 * 翻译功能Hook
 */
export function useTranslation() {
  const { loadingStates, withState } = useState({
    translation: false,
  });

  // 添加动态加载状态
  const currentStatus = ref("idle"); // idle, matching_terms, translating

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

    return lines.map((line, index) => {
      // 使用正则表达式来正确解析 CSV 格式，处理包含逗号的字段
      const matches = line.match(/"([^"]*)","([^"]*)","([^"]*)"/);
      if (matches) {
        const [, en, cn, jp] = matches;
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
   * 获取当前状态的显示文本
   * @returns {string} 状态显示文本
   */
  const getStatusText = () => {
    switch (currentStatus.value) {
      case "matching_terms":
        return t("translation.matchingTerms") || "匹配术语中...";
      case "translating":
        return t("translation.translating") || "翻译中...";
      default:
        return t("translation.translating") || "翻译中...";
    }
  };

  /**
   * 执行翻译
   * @param {string} content - 需要翻译的内容
   * @returns {Promise<Array>} 翻译结果数组
   */
  const performTranslation = async (content) => {
    try {
      const result = await withState("translation", async () => {
        // 重置状态
        currentStatus.value = "idle";
        
        const data = await translate(content, (status) => {
          currentStatus.value = status;
        });
        
        const translationResult = parseTranslationResult(data);

        ElMessage.success(t("translation.translationCompleted"));
        return translationResult;
      });

      return result;
    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage =
        error.message ||
        t("translation.translationFailed");
      ElMessage.error(errorMessage);
      throw error;
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
    currentStatus,
    getStatusText,
    performTranslation,
    extractTranslationData,
  };
}
