import { computed } from "vue";
import { ElMessage } from "element-plus";
import { t } from "../../utils/i18n.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";

/**
 * 翻译结果存储管理Hook
 */
export function useTranslationStorage() {
  const translationCoreStore = useTranslationCoreStore();

  /**
   * 为翻译数据添加编辑状态属性
   * @param {Array} translationData - 纯翻译数据
   * @returns {Array} 包含编辑状态的翻译数据
   */
  const addEditingStates = (translationData) => {
    if (!translationData || !Array.isArray(translationData)) {
      return [];
    }

    // 从第一行数据中提取所有语言 key（排除 editing_ 开头的 key）
    const languageKeys = new Set();
    if (translationData.length > 0) {
      Object.keys(translationData[0]).forEach((key) => {
        if (!key.startsWith("editing_")) {
          languageKeys.add(key);
        }
      });
    }

    // 如果没有从数据中提取到 key，则优先使用保存的 targetLanguages，否则使用当前配置
    if (languageKeys.size === 0) {
      try {
        // 优先使用保存的 translationTargetLanguages
        const savedTargetLanguages =
          translationCoreStore.translationTargetLanguages || [];
        let targetLanguages = [];

        if (savedTargetLanguages.length > 0) {
          // 使用保存的 targetLanguages
          targetLanguages = savedTargetLanguages;
        } else {
          // 回退到当前配置
          targetLanguages = JSON.parse(
            localStorage.getItem("target_languages") || "[]"
          );
        }

        languageKeys.add("en");
        targetLanguages.forEach((lang) => {
          const key = lang.toLowerCase().replace(/\s+/g, "_");
          languageKeys.add(key);
        });
      } catch (error) {
        console.warn("Failed to parse target languages:", error);
        // 配置解析失败时，直接返回原数据（不添加编辑状态）
        return translationData;
      }
    }

    // 如果没有找到任何语言 key，直接返回原数据
    if (languageKeys.size === 0) {
      return translationData;
    }

    // 为每行数据添加编辑状态
    return translationData.map((row) => {
      const result = { ...row };
      languageKeys.forEach((key) => {
        result[`editing_${key}`] = false;
      });
      return result;
    });
  };

  /**
   * 检查是否有上次的翻译结果
   * @returns {boolean} 是否有上次翻译结果
   */
  const hasLastTranslation = () => {
    return translationCoreStore.hasLastTranslation;
  };

  /**
   * 清空上次翻译结果
   */
  const clearLastTranslation = () => {
    translationCoreStore.clearLastTranslation();
    localStorage.removeItem("last_translation");
  };

  return {
    // 状态（使用 computed 确保响应式）
    lastTranslation: computed(() => translationCoreStore.lastTranslation),
    hasLastTranslation: computed(() => translationCoreStore.hasLastTranslation),

    // 方法
    addEditingStates,
    hasLastTranslation,
    clearLastTranslation,
  };
}
