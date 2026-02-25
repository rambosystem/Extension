import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { t } from "../../../utils/i18n.js";
import { debugLog } from "../../../utils/debug.js";
import { TRANSLATION_CONFIG } from "../../config/translation.js";
import { useApiStore } from "./api.js";
import { useTranslationCoreStore } from "../translation/core.js";
import { useTermsStore } from "../terms.js";
import { useAppStore } from "../app.js";
import { useExportStore } from "../translation/export.js";
import { useTranslationCache } from "../../composables/Translation/useTranslationCache.js";
import { useCacheValidation } from "../../composables/Core/useCacheValidation.js";
import { STORAGE_KEYS } from "../../config/storageKeys.js";
import {
  getLocalItem,
  piniaLocalStorage,
  setLocalItem,
} from "../../infrastructure/storage.js";

/**
 * 翻译设置管理状态
 * 管理翻译提示、自动去重、术语匹配参数等
 */
export const useTranslationSettingsStore = defineStore("translationSettings", {
  state: () => {
    // state 初始化时同步读取 localStorage，避免组件渲染时的闪屏
    let autoDeduplication = false; // 默认值：关闭
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const storedValue = getLocalItem(
          STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED
        );
        if (storedValue !== null) {
          autoDeduplication = storedValue === "true";
        }
      } catch (error) {
        console.error(
          "Failed to read autoDeduplication from localStorage:",
          error
        );
      }
    }

    let wordSelectionTranslate = false;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const storedValue = getLocalItem(
          STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED
        );
        if (storedValue !== null) {
          wordSelectionTranslate = storedValue === "true";
        }
      } catch (error) {
        console.error(
          "Failed to read wordSelectionTranslate from localStorage:",
          error
        );
      }
    }

    return {
      // 翻译相关设置
      autoDeduplication,

      // 划词翻译开关
      wordSelectionTranslate,

      // 术语匹配参数（来自 config，不在 UI 中配置）
      similarityThreshold: TRANSLATION_CONFIG.similarityThreshold,
      topK: TRANSLATION_CONFIG.topK,
      maxNGram: TRANSLATION_CONFIG.maxNGram,

      // 去重项目选择
      deduplicateProject: "Common",

      // 公共术语库状态
      adTerms: false,

      // 调试日志开关
      debugLogging: false,

      // 翻译温度（来自 config，不在 UI 中配置）
      translationTemperature: TRANSLATION_CONFIG.translationTemperature,

      // 加载状态
      loadingStates: {},

      // 对话框状态
      dialogVisible: false,
    };
  },

  getters: {
    // 获取所有加载状态
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 检查是否启用调试日志
    isDebugLoggingEnabled: (state) => state.debugLogging,
  },

  actions: {
    /**
     * 设置加载状态
     * @param {string} key - 加载状态键
     * @param {boolean} loading - 加载状态
     */
    setLoading(key, loading) {
      if (this.loadingStates.hasOwnProperty(key)) {
        this.loadingStates[key] = loading;
      }
    },

    /**
     * 异步操作包装器
     * @param {string} key - 状态键
     * @param {Function} asyncFn - 异步函数
     */
    async withLoading(key, asyncFn) {
      try {
        this.setLoading(key, true);
        const result = await asyncFn();
        return result;
      } finally {
        this.setLoading(key, false);
      }
    },

    /**
     * 更新设置项
     * @param {string} key - 设置项
     * @param {any} value - 设置值
     */
    updateSetting(key, value) {
      if (this.hasOwnProperty(key)) {
        this[key] = value;

        // 保存到localStorage
        const storageKey = this.getStorageKey(key);
        if (storageKey) {
          setLocalItem(storageKey, value);
        }
      }
    },

    /**
     * 切换自动去重开关
     * @param {boolean} enabled - 是否启用
     */
    toggleAutoDeduplication(enabled) {
      this.autoDeduplication = enabled;
      setLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED, enabled);
    },

    /**
     * 切换划词翻译开关
     * @param {boolean} enabled - 是否启用
     */
    toggleWordSelectionTranslate(enabled) {
      this.wordSelectionTranslate = enabled;
      setLocalItem(STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED, enabled);
    },

    /**
     * 初始化翻译设置
     * 从localStorage加载设置
     */
    initializeTranslationSettings() {
      try {
        // 加载自动去重设置（如果 state 初始化时已经读取过，这里可以跳过）
        // 但为了确保一致性，仍然从 localStorage 读取
        const autoDeduplication = getLocalItem(
          STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED
        );
        if (autoDeduplication !== null) {
          this.autoDeduplication = autoDeduplication === "true";
        }

        // 加载划词翻译设置
        const wordSelectionTranslate = getLocalItem(
          STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED
        );
        if (wordSelectionTranslate !== null) {
          this.wordSelectionTranslate = wordSelectionTranslate === "true";
        }

        // 术语匹配参数与翻译温度使用 config，不从 localStorage 读取
        this.similarityThreshold = TRANSLATION_CONFIG.similarityThreshold;
        this.topK = TRANSLATION_CONFIG.topK;
        this.maxNGram = TRANSLATION_CONFIG.maxNGram;
        this.translationTemperature = TRANSLATION_CONFIG.translationTemperature;

        // 加载去重项目选择
        const deduplicateProject = getLocalItem(
          STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION
        );
        if (deduplicateProject) {
          this.deduplicateProject = deduplicateProject;
        }

        // 加载公共术语库状态
        const adTerms = getLocalItem(STORAGE_KEYS.AD_TERMS_STATUS);
        if (adTerms !== null) {
          this.adTerms = adTerms === "true";
        }

        // 加载调试日志设置
        const debugLogging = getLocalItem(STORAGE_KEYS.DEBUG_LOGGING_ENABLED);
        if (debugLogging !== null) {
          this.debugLogging = debugLogging === "true";
        }
      } catch (error) {
        console.error("Failed to initialize translation settings:", error);
      }
    },

    /**
     * 初始化翻译设置到默认值
     * 用于缓存清除时重置设置
     */
    initializeToDefaults() {
      // 重置到默认值
      this.autoDeduplication = false; // 重置为默认值：关闭
      this.wordSelectionTranslate = false; // 重置为默认值：关闭
      this.similarityThreshold = TRANSLATION_CONFIG.similarityThreshold;
      this.topK = TRANSLATION_CONFIG.topK;
      this.maxNGram = TRANSLATION_CONFIG.maxNGram;
      this.deduplicateProject = "Common"; // 重置为默认值
      this.translationTemperature = TRANSLATION_CONFIG.translationTemperature;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 同步重置的设置到localStorage（术语匹配与翻译温度来自 config，不写入 localStorage）
      setLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED, false);
      setLocalItem(STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED, false);
      setLocalItem(STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION, "Common");

      // 注意：不重置 adTerms 与 debugLogging
      // 这些设置需要在缓存清除时保留
    },

    /**
     * 获取存储键名
     * @param {string} key - 设置项
     * @returns {string} 存储键名
     */
    getStorageKey(key) {
      const storageKeys = {
        autoDeduplication: STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED,
        wordSelectionTranslate: STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED,
        deduplicateProject: STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION,
        adTerms: STORAGE_KEYS.AD_TERMS_STATUS,
        debugLogging: STORAGE_KEYS.DEBUG_LOGGING_ENABLED,
      };
      return storageKeys[key] || null;
    },

    /**
     * 切换调试日志开关
     * @param {boolean} enabled - 是否启用调试日志
     */
    toggleDebugLogging(enabled) {
      this.debugLogging = enabled;
      setLocalItem(STORAGE_KEYS.DEBUG_LOGGING_ENABLED, enabled);
    },

    /**
     * 初始化所有设置（清除缓存但保留重要设置）
     * 重构后的版本：只调用各Store的初始化函数，禁止直接操作localStorage
     */
    clearAllSettings() {
      try {
        // 调用各Store的初始化函数重置到默认值
        // 1. 初始化翻译设置（保留去重和ad terms设置）
        this.initializeToDefaults();

        // 2. 初始化API设置
        const apiStore = useApiStore();
        apiStore.initializeToDefaults();

        // 3. 初始化翻译核心状态
        const translationCoreStore = useTranslationCoreStore();
        translationCoreStore.initializeToDefaults();

        // 4. 初始化术语状态（只重置开关，不重置数据）
        const termsStore = useTermsStore();
        termsStore.initializeToDefaults();

        // 5. 初始化应用状态
        const appStore = useAppStore();
        appStore.initializeToDefaults();

        // 6. 初始化导出设置（包含 default_project_id）
        const exportStore = useExportStore();
        exportStore.initializeToDefaults();

        // 7. 清空翻译缓存
        const cache = useTranslationCache();
        cache.clearCache();

        // 8. 确保重要设置被正确保存到 localStorage
        this.saveImportantSettings();

        // 9. 异步刷新 Terms Card 数据（不等待完成）
        termsStore.refreshTerms(false).catch((error) => {
          console.error("Terms refresh failed after cache clear:", error);
        });

        // 关闭对话框
        this.dialogVisible = false;

        // 调试信息：显示重置后的设置
        debugLog("Cache initialization completed. Settings reset to defaults:");
        debugLog(
          "- auto_deduplication_enabled:",
          getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED)
        );
        debugLog(
          "- deduplicate_project_selection:",
          getLocalItem(STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION)
        );
        debugLog(
          "- ad_terms_status:",
          getLocalItem(STORAGE_KEYS.AD_TERMS_STATUS)
        );
        debugLog(
          "- terms-store:",
          getLocalItem("terms-store") ? "exists" : "not found"
        );
        debugLog("- Memory autoDeduplication:", this.autoDeduplication);
        debugLog("- Memory deduplicateProject:", this.deduplicateProject);
        debugLog("- Memory adTerms:", this.adTerms);
        // 验证API Key和Token是否被清除
        debugLog(
          "- deepseek_api_key:",
          getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY) ? "exists" : "cleared"
        );
        debugLog(
          "- lokalise_api_token:",
          getLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN) ? "exists" : "cleared"
        );
        debugLog(
          "- lokalise_projects:",
          getLocalItem(STORAGE_KEYS.LOKALISE_PROJECTS) ? "exists" : "cleared"
        );
        debugLog(
          "- default_project_id:",
          getLocalItem(STORAGE_KEYS.DEFAULT_PROJECT_ID) ? "exists" : "cleared"
        );
        debugLog("- API Store apiKey:", apiStore.apiKey || "empty");
        debugLog(
          "- API Store lokaliseApiToken:",
          apiStore.lokaliseApiToken || "empty"
        );
        debugLog(
          "- Export Store defaultProjectId:",
          exportStore.defaultProjectId || "empty"
        );

        ElMessage.success(t("messages.cacheInitializedSuccessfully"));

        // 自动校验缓存初始化结果
        this.autoValidateCache();
      } catch (error) {
        console.error("Failed to initialize cache:", error);
        ElMessage.error(t("messages.failedToInitializeCache"));
      }
    },

    /**
     * 保存重要设置到 localStorage
     * 确保重要设置被正确保存（现在只保存debug logging）
     */
    saveImportantSettings() {
      try {
        // 保存调试日志设置（这是唯一需要保留的设置）
        setLocalItem(STORAGE_KEYS.DEBUG_LOGGING_ENABLED, this.debugLogging);

        debugLog("Important settings saved to localStorage:");
        debugLog("- debug_logging_enabled:", this.debugLogging);
      } catch (error) {
        console.error("Failed to save important settings:", error);
      }
    },

    /**
     * 自动校验缓存初始化结果
     */
    async autoValidateCache() {
      try {
        const { validateCacheInitialization } = useCacheValidation();

        const expectedSettings = {
          autoDeduplication: false, // 重置为默认值：关闭
          deduplicateProject: "Common", // 重置为默认值
          adTerms: false, // 重置为默认值：关闭
          debugLogging: this.debugLogging, // 保持当前设置
          similarityThreshold: TRANSLATION_CONFIG.similarityThreshold,
          topK: TRANSLATION_CONFIG.topK,
          maxNGram: TRANSLATION_CONFIG.maxNGram,
          translationTemperature: TRANSLATION_CONFIG.translationTemperature,
          appLanguage: "en", // 重置为默认值
        };

        const result = await validateCacheInitialization(expectedSettings);

        // 只记录调试信息，不显示用户消息
        debugLog(
          "Auto validation completed:",
          result.success ? "PASSED" : "FAILED"
        );
        if (!result.success) {
          debugLog("Validation issues:", result.errors);
        }

        return result;
      } catch (error) {
        console.error("Auto validation failed:", error);
        return null;
      }
    },

    /**
     * 保存到存储
     * @param {string} key - 存储键
     * @param {any} value - 存储值
     * @returns {boolean} 是否成功
     */
    saveToStorage(key, value) {
      try {
        const stringValue =
          typeof value === "object" ? JSON.stringify(value) : String(value);
        setLocalItem(key, stringValue);
        return true;
      } catch (error) {
        console.error(`Failed to save ${key} to localStorage:`, error);
        return false;
      }
    },
  },

  // 启用持久化存储
  persist: {
    key: "translation-settings-store",
    storage: piniaLocalStorage,
  },
});
