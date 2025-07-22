import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useLoading } from "./useLoading.js";
import { useStorage } from "./useStorage.js";
import { validateDeepSeekApiKey } from "../utils/apiValidation.js";
import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";

/**
 * 设置管理Hook
 */
export function useSettings() {
  // 存储键常量
  const STORAGE_KEYS = {
    apiKey: "deepseek_api_key",
    uploadUrl: "lokalise_upload_url",
    prompt: "deepseek_prompt",
  };

  // 初始化composables
  const { loadingStates, setLoading } = useLoading({
    apiKey: false,
    url: false,
    prompt: false,
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

  /**
   * 处理API Key保存
   */
  const handleSaveAPIKey = async (saveData) => {
    const { value, onSuccess, onError } = saveData;

    if (!value?.trim()) {
      ElMessage.error("Please enter API Key");
      onError();
      return;
    }

    try {
      setLoading("apiKey", true);

      const isValid = await validateDeepSeekApiKey(value);
      if (!isValid) {
        ElMessage.error("API Key is invalid");
        onError();
        return;
      }

      const saved = saveToStorage(STORAGE_KEYS.apiKey, value);
      if (!saved) {
        ElMessage.error("Failed to save API Key");
        onError();
        return;
      }

      formData.apiKey = value.trim();
      ElMessage.success("Save success");
      onSuccess();
    } catch (error) {
      ElMessage.error("API Key validation failed");
      onError();
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
      ElMessage.error("Please enter Lokalise Project Upload URL");
      onError();
      return;
    }

    try {
      setLoading("url", true);

      const saved = saveToStorage(STORAGE_KEYS.uploadUrl, value);
      if (!saved) {
        ElMessage.error("Failed to save URL");
        onError();
        return;
      }

      formData.uploadUrl = value.trim();
      ElMessage.success("Save success");
      onSuccess();
    } catch (error) {
      ElMessage.error("Save failed");
      onError();
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

      ElMessage.success("Save success");
    } catch (error) {
      console.error("Save failed:", error);
      ElMessage.error("Save failed, please try again");
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
      // 重置表单数据
      formData.apiKey = "";
      formData.uploadUrl = "";
      codeContent.value = DEFAULT_TRANSLATION_PROMPT;
    } else {
      ElMessage.error("Failed to clear local storage");
    }
  };

  /**
   * 初始化设置数据
   */
  const initializeSettings = () => {
    const settings = loadSettings(STORAGE_KEYS);

    if (settings.apiKey) {
      formData.apiKey = settings.apiKey;
    }

    if (settings.prompt) {
      codeContent.value = settings.prompt;
    }

    if (settings.uploadUrl) {
      formData.uploadUrl = settings.uploadUrl;
    }
  };

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

    // 方法
    handleSaveAPIKey,
    handleSaveLokaliseURL,
    handleSavePrompt,
    handleClearLocalStorage,
    handleClearLocalStorageConfirm,
    initializeSettings,
  };
}
