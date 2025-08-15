import { ref } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "./useI18n.js";

const { t } = useI18n();

/**
 * 翻译结果存储管理Hook
 */
export function useTranslationStorage() {
  const STORAGE_KEY = "last_translation_result";
  const lastTranslation = ref(null);

  /**
   * 从本地存储加载上次翻译结果
   */
  const loadLastTranslation = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        lastTranslation.value = JSON.parse(saved);
        // console.log(
        //   "Loaded last translation from storage:",
        //   lastTranslation.value
        // );
      } else {
        lastTranslation.value = null;
      }
    } catch (error) {
      console.error(
        "Failed to parse last translation from localStorage:",
        error
      );
      lastTranslation.value = null;
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
      localStorage.setItem(STORAGE_KEY, dataToSave);
      lastTranslation.value = translationData;
      // console.log("Saved translation to storage:", translationData);
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
    return (
      lastTranslation.value &&
      Array.isArray(lastTranslation.value) &&
      lastTranslation.value.length > 0
    );
  };

  /**
   * 清空上次翻译结果
   */
  const clearLastTranslation = () => {
    lastTranslation.value = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    lastTranslation,
    loadLastTranslation,
    saveTranslationToLocal,
    addEditingStates,
    hasLastTranslation,
    clearLastTranslation,
  };
}
