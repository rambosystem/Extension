import { ref, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useState } from "./useState.js";
import { useStorage } from "./useStorage.js";
import { validateDeepSeekApiKey } from "../utils/apiValidation.js";
import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import { isValidURL } from "../utils/urlValidation.js";
import { useI18n } from "./useI18n.js";

/**
 * 设置管理Hook
 */
export function useSettings() {
  // 存储键常量
  const STORAGE_KEYS = {
    apiKey: "deepseek_api_key",
    uploadUrl: "lokalise_upload_url",
    prompt: "deepseek_prompt",
    translationPrompt: "translation_prompt_enabled",
    language: "app_language",
  };

  const { saveToStorage, getFromStorage, clearAllStorage, loadSettings } = useStorage();

  // 状态管理
  const codeContent = ref(DEFAULT_TRANSLATION_PROMPT);
  const dialogVisible = ref(false);
  const originalCodeContent = ref(DEFAULT_TRANSLATION_PROMPT);
  const { t } = useI18n();

  // 立即加载存储的翻译提示状态
  const storedTranslationPrompt = getFromStorage(STORAGE_KEYS.translationPrompt);
  const initialTranslationPrompt = storedTranslationPrompt === "true" || storedTranslationPrompt === true;

  // 初始化composables
  const { 
    loadingStates, 
    booleanStates,
    stringStates,
    setState, 
    setLoading,
    withState 
  } = useState({
    // Loading 状态
    apiKey: false,
    url: false,
    prompt: false,
    adTerms: false,
    // 布尔状态
    isCodeEditing: false,
    translationPrompt: initialTranslationPrompt, // 使用存储的值初始化
    // 字符串状态
    apiKey: "",
    uploadUrl: "",
    language: "en",
  });

  /**
   * 处理API Key保存
   */
  const handleSaveAPIKey = async (saveData) => {
    const { value, onSuccess, onError } = saveData;

    if (!value?.trim()) {
      onError("Please enter API Key");
      return;
    }

    try {
      await withState("apiKey", async () => {
        const isValid = await validateDeepSeekApiKey(value);
        if (!isValid) {
          throw new Error("API Key is invalid");
        }

        const saved = saveToStorage(STORAGE_KEYS.apiKey, value);
        if (!saved) {
          throw new Error("Failed to save API Key");
        }

        setState("apiKey", value.trim(), "string");
      });

      onSuccess();
    } catch (error) {
      console.error("API Key validation failed:", error);
      onError(error.message || "API Key validation failed");
    }
  };

  /**
   * 处理Lokalise URL保存
   */
  const handleSaveLokaliseURL = async (saveData) => {
    const { value, onSuccess, onError } = saveData;

    if (!value?.trim()) {
      onError("Please enter Lokalise Project Upload URL");
      return;
    }

    try {
      await withState("url", async () => {
        if (!isValidURL(value)) {
          throw new Error("Invalid URL");
        }

        const saved = saveToStorage(STORAGE_KEYS.uploadUrl, value);
        if (!saved) {
          throw new Error("Failed to save URL");
        }

        setState("uploadUrl", value.trim(), "string");
      });

      onSuccess();
    } catch (error) {
      console.error("Save failed:", error);
      onError(error.message || "Save failed");
    }
  };

  /**
   * 处理Prompt保存
   */
  const handleSavePrompt = async () => {
    if (!codeContent.value?.trim()) {
      ElMessage.error(t("settings.pleaseEnterPrompt"));
      return;
    }

    try {
      await withState("prompt", async () => {
        const saved = saveToStorage(STORAGE_KEYS.prompt, codeContent.value);
        if (!saved) {
          throw new Error("Failed to save prompt");
        }
      });

      ElMessage.success(t("settings.saveSuccessful"));
      
      originalCodeContent.value = codeContent.value;
      setState("isCodeEditing", false, "boolean");
      
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
      return false;
    }
  };

  /**
   * 处理清空本地存储
   */
  const handleClearLocalStorage = () => {
    dialogVisible.value = true;
  };

  const handleClearLocalStorageConfirm = () => {
    const success = clearAllStorage();
    dialogVisible.value = false;

    if (success) {
      ElMessage.success(t("settings.clearLocalStorageSuccess"));
      initializeSettings();
      
      // 触发清空缓存事件，通知其他组件重新初始化状态
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localStorageCleared'));
      }
    } else {
      ElMessage.error(t("settings.clearLocalStorageFailed"));
    }
  };

  /**
   * 处理翻译Prompt开关状态变化
   */
  const handleTranslationPromptChange = (enabled) => {
    try {
      const saved = saveToStorage(STORAGE_KEYS.translationPrompt, enabled ? "true" : "false");
      if (!saved) {
        throw new Error("Failed to save translation prompt setting");
      }

      setState("translationPrompt", enabled, "boolean");
    } catch (error) {
      console.error("Translation prompt change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 处理语言切换
   */
  const handleLanguageChange = (language) => {
    try {
      const saved = saveToStorage(STORAGE_KEYS.language, language);
      if (!saved) {
        throw new Error("Failed to save language setting");
      }

      setState("language", language, "string");
      
      localStorage.setItem('app_language', language);
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
      
      ElMessage.success(t("settings.saveSuccessful"));
    } catch (error) {
      console.error("Language change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 初始化设置数据
   */
  const initializeSettings = () => {
    const settings = loadSettings(STORAGE_KEYS);

    setState("apiKey", settings.apiKey || "", "string");
    setState("uploadUrl", settings.uploadUrl || "", "string");
    setState("language", settings.language || "en", "string");

    if (settings.prompt && settings.prompt.trim()) {
      codeContent.value = settings.prompt;
    } else {
      codeContent.value = DEFAULT_TRANSLATION_PROMPT;
    }

    originalCodeContent.value = codeContent.value;
  };

  // 监听 codeContent 变化，管理编辑状态
  watch(
    () => codeContent.value,
    (newValue) => {
      const hasChanged = newValue.trim() !== originalCodeContent.value.trim();
      
      if (hasChanged && !booleanStates.isCodeEditing) {
        setState("isCodeEditing", true, "boolean");
      } else if (!hasChanged && booleanStates.isCodeEditing) {
        setState("isCodeEditing", false, "boolean");
      }
    }
  );

  // 监听 codeContent 变化，更新原始值（仅在非编辑状态）
  watch(
    () => codeContent.value,
    (newValue) => {
      if (!booleanStates.isCodeEditing) {
        originalCodeContent.value = newValue || "";
      }
    }
  );

  // 组件挂载时初始化
  onMounted(() => {
    initializeSettings();
  });

  return {
    loadingStates,
    codeContent,
    dialogVisible,
    stringStates,
    booleanStates,
    handleSaveAPIKey,
    handleSaveLokaliseURL,
    handleSavePrompt,
    handleClearLocalStorage,
    handleClearLocalStorageConfirm,
    handleTranslationPromptChange,
    handleLanguageChange,
    initializeSettings,
  };
}
