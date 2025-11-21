import { ElMessage } from "element-plus";
import { translate } from "../../requests/lokalise.js";
import { useI18n } from "../Core/useI18n.js";
import { ref } from "vue";

const { t } = useI18n();

/**
 * 翻译功能Hook
 */
export function useTranslation() {
  const loadingStates = ref({
    translation: false,
  });

  // 添加动态加载状态
  const currentStatus = ref("idle"); // idle, matching_terms, translating

  /**
   * 解析翻译结果文本为结构化数据
   * @param {string} data - API返回的文本数据（JSON 格式）
   * @returns {Array} 解析后的翻译结果数组
   */
  const parseTranslationResult = (data) => {
    try {
      // 清理数据：移除可能的 markdown 代码块标记
      let cleanedData = data.trim();

      // 如果数据被包裹在 markdown 代码块中，提取 JSON 部分
      const jsonMatch = cleanedData.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        cleanedData = jsonMatch[1];
      } else {
        // 尝试直接查找 JSON 数组的开始和结束
        const arrayStart = cleanedData.indexOf("[");
        const arrayEnd = cleanedData.lastIndexOf("]");
        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
          cleanedData = cleanedData.substring(arrayStart, arrayEnd + 1);
        }
      }

      // 解析 JSON
      const jsonData = JSON.parse(cleanedData);

      // 验证是否为数组
      if (!Array.isArray(jsonData)) {
        throw new Error("Expected JSON array but got: " + typeof jsonData);
      }

      // 获取目标语言设置
      const targetLanguages = JSON.parse(
        localStorage.getItem("target_languages") || "[]"
      );

      // 构建列名数组：第一列是英文，后面是目标语言
      const columns = [
        "en",
        ...targetLanguages.map((lang) => {
          // 将语言名称转换为小写并替换空格为下划线
          return lang.toLowerCase().replace(/\s+/g, "_");
        }),
      ];

      // 转换 JSON 数据为统一格式
      return jsonData.map((item) => {
        const result = {};
        columns.forEach((col) => {
          // 从 JSON 对象中获取对应字段的值
          result[col] = item[col] || "";
          result[`editing_${col}`] = false;
        });
        return result;
      });
    } catch (error) {
      console.error("Failed to parse JSON translation result:", error);
      console.error("Raw data:", data);
      throw new Error(
        `Failed to parse translation result as JSON: ${error.message}`
      );
    }
  };

  /**
   * 获取当前状态的显示文本
   * @returns {string} 状态显示文本
   */
  const getStatusText = () => {
    switch (currentStatus.value) {
      case "matching_terms":
        return t("translation.matchingTerms") || "Terms Matching...";
      case "translating":
        return t("translation.translating") || "Translating...";
      default:
        return t("translation.translating") || "Translating...";
    }
  };

  /**
   * 执行翻译
   * @param {string} content - 需要翻译的内容
   * @returns {Promise<Array>} 翻译结果数组
   */
  const performTranslation = async (content) => {
    try {
      loadingStates.value.translation = true;

      // 重置状态
      currentStatus.value = "idle";

      const data = await translate(content, (status) => {
        currentStatus.value = status;
      });

      const translationResult = parseTranslationResult(data);

      ElMessage.success(t("translation.translationCompleted"));
      return translationResult;
    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage = error.message || t("translation.translationFailed");
      ElMessage.error(errorMessage);
      throw error;
    } finally {
      loadingStates.value.translation = false;
    }
  };

  /**
   * 从翻译结果中提取纯数据（不包含编辑状态）
   * @param {Array} translationResult - 包含编辑状态的翻译结果
   * @returns {Array} 纯翻译数据
   */
  const extractTranslationData = (translationResult) => {
    // 获取目标语言设置
    const targetLanguages = JSON.parse(
      localStorage.getItem("target_languages") || "[]"
    );

    // 构建列名数组
    const columns = [
      "en",
      ...targetLanguages.map((lang) => {
        return lang.toLowerCase().replace(/\s+/g, "_");
      }),
    ];

    return translationResult.map((row) => {
      const data = {};
      columns.forEach((col) => {
        if (row.hasOwnProperty(col)) {
          data[col] = row[col];
        }
      });
      return data;
    });
  };

  return {
    loadingStates,
    currentStatus,
    getStatusText,
    performTranslation,
    extractTranslationData,
  };
}
