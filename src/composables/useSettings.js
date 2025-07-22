import { ref, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useState } from "./useState.js";
import { useStorage } from "./useStorage.js";
import { validateDeepSeekApiKey } from "../utils/apiValidation.js";
import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import { isValidURL } from "../utils/urlValidation.js";
/**
 * 设置管理Hook
 */
export function useSettings() {
  // 存储键常量
  const STORAGE_KEYS = {
    apiKey: "deepseek_api_key",
    uploadUrl: "lokalise_upload_url",
    prompt: "deepseek_prompt",
    translationPrompt: "translation_prompt",
  };

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
    translationPrompt: false,
    // 布尔状态
    isCodeEditing: false,
    // 字符串状态
    apiKey: "",
    uploadUrl: "",
  });

  const { saveToStorage, getFromStorage, clearAllStorage, loadSettings } =
    useStorage();

  // 状态管理
  const codeContent = ref(DEFAULT_TRANSLATION_PROMPT);
  const dialogVisible = ref(false);
  const originalCodeContent = ref(DEFAULT_TRANSLATION_PROMPT);

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
        // 检查是否为合法的URL
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
      ElMessage.error("Please enter Prompt");
      return;
    }

    try {
      await withState("prompt", async () => {
        const saved = saveToStorage(STORAGE_KEYS.prompt, codeContent.value);
        if (!saved) {
          throw new Error("Failed to save prompt");
        }
      });

      ElMessage.success("Save successful");
      
      // 保存成功，更新原始值并退出编辑状态
      originalCodeContent.value = codeContent.value;
      setState("isCodeEditing", false, "boolean");
      
      return true; // 返回成功状态
    } catch (error) {
      console.error("Save failed:", error);
      ElMessage.error(error.message || "Save failed, please try again");
      return false; // 返回失败状态
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
      ElMessage.success("Clear Local Storage Success");
      // 重新加载数据（此时应该加载默认值）
      initializeSettings();
    } else {
      ElMessage.error("Failed to clear local storage");
    }
  };

  /**
   * 初始化设置数据
   */
  const initializeSettings = () => {
    const settings = loadSettings(STORAGE_KEYS);

    // 始终设置字段，即使为空也要更新
    setState("apiKey", settings.apiKey || "", "string");
    setState("uploadUrl", settings.uploadUrl || "", "string");

    // 使用保存的prompt，如果为空则使用默认prompt
    if (settings.prompt && settings.prompt.trim()) {
      codeContent.value = settings.prompt;
    } else {
      // 如果没有保存的prompt或为空，使用默认prompt
      codeContent.value = DEFAULT_TRANSLATION_PROMPT;
    }

    // 初始化原始值
    originalCodeContent.value = codeContent.value;
  };

  // 监听 codeContent 变化，管理编辑状态
  watch(
    () => codeContent.value,
    (newValue) => {
      // 检查是否有实际变化
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
    // 状态
    loadingStates,
    codeContent,
    dialogVisible,
    stringStates, // 替代 formData
    booleanStates, // 包含 isCodeEditing

    // 方法
    handleSaveAPIKey,
    handleSaveLokaliseURL,
    handleSavePrompt,
    handleClearLocalStorage,
    handleClearLocalStorageConfirm,
    initializeSettings,
  };
}
