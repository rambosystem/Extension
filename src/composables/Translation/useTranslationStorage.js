import { computed } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "../Core/useI18n.js";
import { useTranslationStore } from "../../stores/translation.js";

const { t } = useI18n();

/**
 * 翻译结果存储管理Hook
 */
export function useTranslationStorage() {
  const translationStore = useTranslationStore();

  /**
   * 从本地存储加载上次翻译结果
   */
  const loadLastTranslation = () => {
    try {
      const saved = localStorage.getItem("last_translation");
      if (saved) {
        const translationData = JSON.parse(saved);
        translationStore.setLastTranslation(translationData);
      } else {
        translationStore.clearLastTranslation();
      }
    } catch (error) {
      console.error(
        "Failed to parse last translation from localStorage:",
        error
      );
      translationStore.clearLastTranslation();
      ElMessage.warning(t("storage.loadFailed"));
    }
  };

  /**
   * 保存翻译结果到本地存储
   * @param {Array} translationData - 翻译数据（不包含编辑状态）
   */
  const saveTranslationToLocal = (translationData) => {
    try {
      const dataToSave = JSON.stringify(translationData);
      localStorage.setItem("last_translation", dataToSave);
      translationStore.setLastTranslation(translationData);
    } catch (error) {
      console.error("Failed to save translation to localStorage:", error);
      ElMessage.warning(t("storage.saveFailed"));
    }
  };

  /**
   * 为翻译数据添加编辑状态属性
   * @param {Array} translationData - 纯翻译数据
   * @returns {Array} 包含编辑状态的翻译数据
   */
  const addEditingStates = (translationData) => {
    if (!translationData || !Array.isArray(translationData)) {
      return [];
    }

    return translationData.map((row) => ({
      ...row,
      editing_en: false,
      editing_cn: false,
      editing_jp: false,
    }));
  };

  /**
   * 检查是否有上次的翻译结果
   * @returns {boolean} 是否有上次翻译结果
   */
  const hasLastTranslation = () => {
    return translationStore.hasLastTranslation;
  };

  /**
   * 清空上次翻译结果
   */
  const clearLastTranslation = () => {
    translationStore.clearLastTranslation();
    localStorage.removeItem("last_translation");
  };

  return {
    // 状态（使用 computed 确保响应式）
    lastTranslation: computed(() => translationStore.lastTranslation),
    hasLastTranslation: computed(() => translationStore.hasLastTranslation),

    // 方法
    loadLastTranslation,
    saveTranslationToLocal,
    addEditingStates,
    hasLastTranslation,
    clearLastTranslation,
  };
}
