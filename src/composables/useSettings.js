import { ref, reactive, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useLoading } from "./useLoading.js";
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
  const { loadingStates, setLoading } = useLoading({
    apiKey: false,
    url: false,
    prompt: false,
    translationPrompt: false,
  });

  const { saveToStorage, getFromStorage, clearAllStorage, loadSettings } =
    useStorage();

  // 状态管理
  const codeContent = ref(DEFAULT_TRANSLATION_PROMPT);
  const dialogVisible = ref(false);

  const formData = reactive({
    apiKey: "",
    uploadUrl: "",
  });

  // CodeEditor 编辑状态管理
  const isCodeEditing = ref(false);
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
      setLoading("apiKey", true);

      const isValid = await validateDeepSeekApiKey(value);
      if (!isValid) {
        onError("API Key is invalid");
        return;
      }

      const saved = saveToStorage(STORAGE_KEYS.apiKey, value);
      if (!saved) {
        onError("Failed to save API Key");
        return;
      }

      formData.apiKey = value.trim();
      onSuccess();
    } catch (error) {
      console.error("API Key validation failed:", error);
      onError("API Key validation failed");
    } finally {
      setLoading("apiKey", false);
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
      setLoading("url", true);

      // 检查是否为合法的URL
      if (!isValidURL(value)) {
        onError("Invalid URL");
        return;
      }

      const saved = saveToStorage(STORAGE_KEYS.uploadUrl, value);
      if (!saved) {
        onError("Failed to save URL");
        return;
      }

      formData.uploadUrl = value.trim();
      onSuccess();
    } catch (error) {
      console.error("Save failed:", error);
      onError("Save failed");
    } finally {
      setLoading("url", false);
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
      setLoading("prompt", true);

      const saved = saveToStorage(STORAGE_KEYS.prompt, codeContent.value);
      if (!saved) {
        ElMessage.error("Failed to save prompt");
        return;
      }

      ElMessage.success("Save successful");
      
      // 保存成功，更新原始值并退出编辑状态
      originalCodeContent.value = codeContent.value;
      isCodeEditing.value = false;
      
      return true; // 返回成功状态
    } catch (error) {
      console.error("Save failed:", error);
      ElMessage.error("Save failed, please try again");
      return false; // 返回失败状态
    } finally {
      setLoading("prompt", false);
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
    formData.apiKey = settings.apiKey || "";
    formData.uploadUrl = settings.uploadUrl || "";

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
      
      if (hasChanged && !isCodeEditing.value) {
        isCodeEditing.value = true;
      } else if (!hasChanged && isCodeEditing.value) {
        isCodeEditing.value = false;
      }
    }
  );

  // 监听 codeContent 变化，更新原始值（仅在非编辑状态）
  watch(
    () => codeContent.value,
    (newValue) => {
      if (!isCodeEditing.value) {
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
    formData,
    isCodeEditing,

    // 方法
    handleSaveAPIKey,
    handleSaveLokaliseURL,
    handleSavePrompt,
    handleClearLocalStorage,
    handleClearLocalStorageConfirm,
    initializeSettings,
  };
}
