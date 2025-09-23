import { ref, onMounted, onUnmounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useState } from "./useState.js";
import { useStorage } from "./useStorage.js";
import { validateDeepSeekApiKey } from "../utils/apiValidation.js";
import { getUserProjects } from "../requests/lokalise.js";
import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import { useI18n } from "./useI18n.js";

/**
 * 设置管理Hook
 */
export function useSettings() {
  // 存储键常量
  const STORAGE_KEYS = {
    apiKey: "deepseek_api_key",
    lokaliseApiToken: "lokalise_api_token",
    lokaliseProjects: "lokalise_projects",
    prompt: "custom_translation_prompt",
    translationPrompt: "translation_prompt_enabled",
    autoDeduplication: "auto_deduplication_enabled",
    language: "app_language",
    similarityThreshold: "termMatch_similarity_threshold",
    topK: "termMatch_top_k",
    maxNGram: "termMatch_max_ngram",
    adTerms: "ad_terms_status",
    excelBaselineKey: "excel_baseline_key",
    deduplicateProject: "deduplicate_project_selection",
  };

  // 默认值常量
  const DEFAULT_VALUES = {
    similarityThreshold: 0.7,
    topK: 10,
    maxNGram: 3,
    translationPrompt: true,
    autoDeduplication: false,
    language: "en",
    adTerms: true,
    excelBaselineKey: "",
    deduplicateProject: "AmazonSearch",
  };

  const { saveToStorage, getFromStorage, clearAllStorage, loadSettings } =
    useStorage();

  // 状态管理
  const codeContent = ref(DEFAULT_TRANSLATION_PROMPT);
  const dialogVisible = ref(false);
  const originalCodeContent = ref(DEFAULT_TRANSLATION_PROMPT);
  // 立即加载存储的相似度阈值，默认为 0.7
  const getStoredSimilarityThreshold = () => {
    try {
      const stored = getFromStorage(STORAGE_KEYS.similarityThreshold);
      const value = stored
        ? parseFloat(stored)
        : DEFAULT_VALUES.similarityThreshold;
      return isNaN(value)
        ? DEFAULT_VALUES.similarityThreshold
        : Math.max(0.5, Math.min(1.0, value));
    } catch (error) {
      console.error("Failed to get similarity threshold from storage:", error);
      return DEFAULT_VALUES.similarityThreshold;
    }
  };

  // 立即加载存储的 top_k，默认为 10
  const getStoredTopK = () => {
    try {
      const stored = getFromStorage(STORAGE_KEYS.topK);
      const value = stored ? parseInt(stored) : DEFAULT_VALUES.topK;
      return isNaN(value)
        ? DEFAULT_VALUES.topK
        : Math.max(1, Math.min(50, value));
    } catch (error) {
      console.error("Failed to get top_k from storage:", error);
      return DEFAULT_VALUES.topK;
    }
  };

  // 立即加载存储的 max_ngram，默认为 3
  const getStoredMaxNGram = () => {
    try {
      const stored = getFromStorage(STORAGE_KEYS.maxNGram);
      const value = stored ? parseInt(stored) : DEFAULT_VALUES.maxNGram;
      return isNaN(value)
        ? DEFAULT_VALUES.maxNGram
        : Math.max(1, Math.min(5, value));
    } catch (error) {
      console.error("Failed to get max_ngram from storage:", error);
      return DEFAULT_VALUES.maxNGram;
    }
  };

  const similarityThreshold = ref(getStoredSimilarityThreshold());
  const topK = ref(getStoredTopK());
  const maxNGram = ref(getStoredMaxNGram());

  // 立即加载存储的baseline key
  const getStoredExcelBaselineKey = () => {
    try {
      const stored = getFromStorage(STORAGE_KEYS.excelBaselineKey);
      return stored || DEFAULT_VALUES.excelBaselineKey;
    } catch (error) {
      console.error("Failed to get excel baseline key from storage:", error);
      return DEFAULT_VALUES.excelBaselineKey;
    }
  };

  const excelBaselineKey = ref(getStoredExcelBaselineKey());
  const { t } = useI18n();

  // 立即加载存储的翻译提示状态
  const storedTranslationPrompt = getFromStorage(
    STORAGE_KEYS.translationPrompt
  );
  const initialTranslationPrompt =
    storedTranslationPrompt !== undefined
      ? storedTranslationPrompt === "true" || storedTranslationPrompt === true
      : DEFAULT_VALUES.translationPrompt;

  // 立即加载存储的自动去重状态
  const storedAutoDeduplication = getFromStorage(
    STORAGE_KEYS.autoDeduplication
  );
  const initialAutoDeduplication =
    storedAutoDeduplication !== undefined
      ? storedAutoDeduplication === "true" || storedAutoDeduplication === true
      : DEFAULT_VALUES.autoDeduplication;

  // 初始化composables
  const {
    loadingStates,
    booleanStates,
    stringStates,
    setState,
    setLoading,
    withState,
  } = useState({
    // Loading 状态
    apiKey: false,
    url: false,
    prompt: false,
    lokaliseApiToken: false,
    // 布尔状态
    isCodeEditing: false,
    translationPrompt: initialTranslationPrompt, // 使用存储的值初始化
    autoDeduplication: initialAutoDeduplication, // 使用存储的值初始化
    adTerms: DEFAULT_VALUES.adTerms, // Public Terms Library状态
    // 字符串状态
    apiKey: "",
    language: DEFAULT_VALUES.language,
    lokaliseApiToken: "",
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
   * 处理Lokalise API Token保存
   */
  const handleSaveLokaliseApiToken = async (saveData) => {
    const { value, onSuccess, onError } = saveData;

    if (!value?.trim()) {
      onError("Please enter Lokalise API Token");
      return;
    }

    try {
      await withState("lokaliseApiToken", async () => {
        // 先保存 API token 到 localStorage，这样 getUserProjects 就能读取到
        const saved = saveToStorage(
          STORAGE_KEYS.lokaliseApiToken,
          value.trim()
        );
        if (!saved) {
          throw new Error("Failed to save API Token");
        }

        // 调用 getUserProjects 验证 token 并获取项目列表
        const projects = await getUserProjects();

        // 保存项目列表
        const projectsSaved = saveToStorage(
          STORAGE_KEYS.lokaliseProjects,
          projects
        );
        if (!projectsSaved) {
          throw new Error("Failed to save projects list");
        }

        setState("lokaliseApiToken", value.trim(), "string");
      });

      onSuccess();
    } catch (error) {
      console.error("Lokalise API Token validation failed:", error);
      onError(error.message || "API Token validation failed");
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

      // 重新初始化所有设置（包括重置到默认值）
      initializeSettings();

      // 重置术语匹配参数到默认值
      similarityThreshold.value = DEFAULT_VALUES.similarityThreshold;
      topK.value = DEFAULT_VALUES.topK;
      maxNGram.value = DEFAULT_VALUES.maxNGram;

      // 确保Translation Prompt状态重置为默认值
      setState(
        "translationPrompt",
        DEFAULT_VALUES.translationPrompt,
        "boolean"
      );

      // 确保Auto Deduplication状态重置为默认值
      setState(
        "autoDeduplication",
        DEFAULT_VALUES.autoDeduplication,
        "boolean"
      );

      // 重置Excel Baseline Key到默认值
      excelBaselineKey.value = DEFAULT_VALUES.excelBaselineKey;

      // 重置去重项目选择到默认值
      window.dispatchEvent(
        new CustomEvent("deduplicateProjectChanged", {
          detail: { project: DEFAULT_VALUES.deduplicateProject },
        })
      );

      // 触发清空缓存事件，通知其他组件重新初始化状态
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("localStorageCleared"));
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
      const saved = saveToStorage(
        STORAGE_KEYS.translationPrompt,
        enabled ? "true" : "false"
      );
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
   * 处理自动去重开关状态变化
   */
  const handleAutoDeduplicationChange = (enabled) => {
    try {
      const saved = saveToStorage(
        STORAGE_KEYS.autoDeduplication,
        enabled ? "true" : "false"
      );
      if (!saved) {
        throw new Error("Failed to save auto deduplication setting");
      }

      setState("autoDeduplication", enabled, "boolean");
    } catch (error) {
      console.error("Auto deduplication change failed:", error);
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

      localStorage.setItem("app_language", language);
      window.dispatchEvent(
        new CustomEvent("languageChanged", { detail: { language } })
      );

      ElMessage.success(t("settings.saveSuccessful"));
    } catch (error) {
      console.error("Language change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 处理相似度阈值变化
   */
  const handleSimilarityThresholdChange = (value) => {
    try {
      // 验证值范围并向下取整到2位小数
      const roundedValue = Math.floor(value * 100) / 100;
      const validValue = Math.max(0.5, Math.min(1.0, roundedValue));

      const saved = saveToStorage(
        STORAGE_KEYS.similarityThreshold,
        validValue.toString()
      );
      if (!saved) {
        throw new Error("Failed to save similarity threshold setting");
      }

      similarityThreshold.value = validValue;

      // 触发事件通知其他组件
      window.dispatchEvent(
        new CustomEvent("similarityThresholdChanged", {
          detail: { similarityThreshold: validValue },
        })
      );
    } catch (error) {
      console.error("Similarity threshold change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 处理 top_k 变化
   */
  const handleTopKChange = (value) => {
    try {
      // 验证值范围并取整
      const validValue = Math.max(1, Math.min(50, Math.floor(value)));

      const saved = saveToStorage(STORAGE_KEYS.topK, validValue.toString());
      if (!saved) {
        throw new Error("Failed to save top_k setting");
      }

      topK.value = validValue;

      // 触发事件通知其他组件
      window.dispatchEvent(
        new CustomEvent("topKChanged", {
          detail: { topK: validValue },
        })
      );
    } catch (error) {
      console.error("Top K change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 处理 max_ngram 变化
   */
  const handleMaxNGramChange = (value) => {
    try {
      // 验证值范围并取整
      const validValue = Math.max(1, Math.min(5, Math.floor(value)));

      const saved = saveToStorage(STORAGE_KEYS.maxNGram, validValue.toString());
      if (!saved) {
        throw new Error("Failed to save max_ngram setting");
      }

      maxNGram.value = validValue;

      // 触发事件通知其他组件
      window.dispatchEvent(
        new CustomEvent("maxNGramChanged", {
          detail: { maxNGram: validValue },
        })
      );
    } catch (error) {
      console.error("Max N-gram change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 处理Public Terms Library状态变化
   */
  const handleAdTermsChange = (enabled) => {
    try {
      const saved = saveToStorage(STORAGE_KEYS.adTerms, enabled);
      if (!saved) {
        throw new Error("Failed to save ad terms setting");
      }

      // 触发事件通知其他组件
      window.dispatchEvent(
        new CustomEvent("adTermsChanged", {
          detail: { adTerms: enabled },
        })
      );
    } catch (error) {
      console.error("Ad terms change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 处理去重项目选择变化
   */
  const handleDeduplicateProjectChange = (project) => {
    try {
      const saved = saveToStorage(STORAGE_KEYS.deduplicateProject, project);
      if (!saved) {
        throw new Error("Failed to save deduplicate project setting");
      }

      // 触发事件通知其他组件
      window.dispatchEvent(
        new CustomEvent("deduplicateProjectChanged", {
          detail: { project },
        })
      );
    } catch (error) {
      console.error("Deduplicate project change failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
    }
  };

  /**
   * 获取存储的去重项目选择
   */
  const getStoredDeduplicateProject = () => {
    try {
      const stored = getFromStorage(STORAGE_KEYS.deduplicateProject);
      return stored || DEFAULT_VALUES.deduplicateProject;
    } catch (error) {
      console.error("Failed to get deduplicate project from storage:", error);
      return DEFAULT_VALUES.deduplicateProject;
    }
  };

  /**
   * 处理Excel Baseline Key保存
   */
  const handleSaveExcelBaselineKey = (value) => {
    // 如果是清空操作（空值），直接保存空值
    if (!value?.trim()) {
      try {
        const saved = saveToStorage(STORAGE_KEYS.excelBaselineKey, "");
        if (!saved) {
          throw new Error("Failed to clear Excel baseline key");
        }

        excelBaselineKey.value = "";
        return true;
      } catch (error) {
        console.error("Clear failed:", error);
        ElMessage.error(error.message || t("settings.saveFailed"));
        return false;
      }
    }

    // 验证格式：key+数字
    if (!value.match(/^[a-zA-Z]+[0-9]+$/)) {
      ElMessage.warning(t("translation.excelBaselineKeySaveWarning"));
      return false;
    }

    try {
      const saved = saveToStorage(STORAGE_KEYS.excelBaselineKey, value.trim());
      if (!saved) {
        throw new Error("Failed to save Excel baseline key");
      }

      excelBaselineKey.value = value.trim();
      ElMessage.success(t("translation.excelBaselineKeySaveSuccess"));
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      ElMessage.error(error.message || t("settings.saveFailed"));
      return false;
    }
  };

  /**
   * 初始化设置数据
   */
  const initializeSettings = () => {
    const settings = loadSettings(STORAGE_KEYS);

    setState("apiKey", settings.apiKey || "", "string");
    setState("lokaliseApiToken", settings.lokaliseApiToken || "", "string");
    setState(
      "language",
      settings.language || DEFAULT_VALUES.language,
      "string"
    );

    // 处理翻译提示开关状态
    const storedTranslationPrompt = settings.translationPrompt;
    const translationPromptEnabled =
      storedTranslationPrompt !== undefined
        ? storedTranslationPrompt === "true" || storedTranslationPrompt === true
        : DEFAULT_VALUES.translationPrompt;
    setState("translationPrompt", translationPromptEnabled, "boolean");

    // 处理自动去重开关状态
    const storedAutoDeduplication = settings.autoDeduplication;
    const autoDeduplicationEnabled =
      storedAutoDeduplication !== undefined
        ? storedAutoDeduplication === "true" || storedAutoDeduplication === true
        : DEFAULT_VALUES.autoDeduplication;
    setState("autoDeduplication", autoDeduplicationEnabled, "boolean");

    // 处理Public Terms Library开关状态
    const storedAdTerms = settings.adTerms;
    const adTermsEnabled =
      storedAdTerms !== undefined ? storedAdTerms : DEFAULT_VALUES.adTerms;
    setState("adTerms", adTermsEnabled, "boolean");

    // 处理Excel Baseline Key
    if (settings.excelBaselineKey) {
      excelBaselineKey.value = settings.excelBaselineKey;
    }

    // 处理去重项目选择
    const storedDeduplicateProject = settings.deduplicateProject;
    const deduplicateProject =
      storedDeduplicateProject || DEFAULT_VALUES.deduplicateProject;
    // 触发项目选择变化事件，通知其他组件
    window.dispatchEvent(
      new CustomEvent("deduplicateProjectChanged", {
        detail: { project: deduplicateProject },
      })
    );

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

  // 监听baseline key清空事件
  const handleBaselineKeyCleared = () => {
    excelBaselineKey.value = "";
  };

  // 组件挂载时初始化
  onMounted(() => {
    initializeSettings();

    // 添加baseline key清空事件监听
    window.addEventListener("baselineKeyCleared", handleBaselineKeyCleared);
  });

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener("baselineKeyCleared", handleBaselineKeyCleared);
  });

  return {
    loadingStates,
    codeContent,
    dialogVisible,
    stringStates,
    booleanStates,
    similarityThreshold,
    topK,
    maxNGram,
    excelBaselineKey,
    handleSaveAPIKey,
    handleSaveLokaliseApiToken,
    handleSavePrompt,
    handleClearLocalStorage,
    handleClearLocalStorageConfirm,
    handleTranslationPromptChange,
    handleAutoDeduplicationChange,
    handleLanguageChange,
    handleSimilarityThresholdChange,
    handleTopKChange,
    handleMaxNGramChange,
    handleAdTermsChange,
    handleSaveExcelBaselineKey,
    initializeSettings,
    handleDeduplicateProjectChange,
    getStoredDeduplicateProject,
  };
}
