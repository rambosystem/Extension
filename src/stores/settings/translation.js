import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { DEFAULT_TRANSLATION_PROMPT } from "../../config/prompts.js";
import { debugLog } from "../../utils/debug.js";
import { useApiStore } from "./api.js";
import { useTranslationCoreStore } from "../translation/core.js";
import { useTermsStore } from "../terms.js";
import { useAppStore } from "../app.js";
import { useTranslationCache } from "../../composables/Translation/useTranslationCache.js";
import { useCacheValidation } from "../../composables/Core/useCacheValidation.js";

/**
 * 翻译设置管理状态
 * 管理翻译提示、自动去重、术语匹配参数等
 */
export const useTranslationSettingsStore = defineStore("translationSettings", {
  state: () => ({
    // 翻译相关设置
    translationPrompt: false,
    autoDeduplication: true,
    customPrompt: DEFAULT_TRANSLATION_PROMPT,

    // 术语匹配参数
    similarityThreshold: 0.7,
    topK: 10,
    maxNGram: 3,

    // 去重项目选择
    deduplicateProject: "Common",

    // 公共术语库状态
    adTerms: true,

    // 调试日志开关
    debugLogging: false,

    // 翻译温度设置
    translationTemperature: 0.1,

    // 加载状态
    loadingStates: {
      prompt: false,
    },

    // 编辑状态
    isCodeEditing: false,

    // 对话框状态
    dialogVisible: false,
  }),

  getters: {
    // 获取所有加载状态
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 检查是否有未保存的更改
    hasUnsavedChanges: (state) => state.isCodeEditing,

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
     * 保存自定义翻译提示
     */
    async saveCustomPrompt() {
      if (!this.customPrompt?.trim()) {
        ElMessage.error("Please enter translation prompt");
        return false;
      }

      try {
        await this.withLoading("prompt", async () => {
          const saved = this.saveToStorage(
            "custom_translation_prompt",
            this.customPrompt
          );
          if (!saved) {
            throw new Error("Failed to save prompt");
          }
        });

        this.isCodeEditing = false;
        ElMessage.success("Translation prompt saved successfully");
        return true;
      } catch (error) {
        console.error("Save prompt failed:", error);
        ElMessage.error(error.message || "Failed to save translation prompt");
        return false;
      }
    },

    /**
     * 更新设置值
     * @param {string} key - 设置键
     * @param {any} value - 设置值
     */
    updateSetting(key, value) {
      if (this.hasOwnProperty(key)) {
        this[key] = value;

        // 保存到localStorage
        const storageKey = this.getStorageKey(key);
        if (storageKey) {
          localStorage.setItem(
            storageKey,
            typeof value === "object" ? JSON.stringify(value) : value
          );
        }
      }
    },

    /**
     * 切换翻译提示开关
     * @param {boolean} enabled - 是否启用
     */
    toggleTranslationPrompt(enabled) {
      this.translationPrompt = enabled;
      localStorage.setItem(
        "translation_prompt_enabled",
        enabled ? "true" : "false"
      );
    },

    /**
     * 切换自动去重开关
     * @param {boolean} enabled - 是否启用
     */
    toggleAutoDeduplication(enabled) {
      this.autoDeduplication = enabled;
      localStorage.setItem(
        "auto_deduplication_enabled",
        enabled ? "true" : "false"
      );
    },

    /**
     * 更新相似度阈值
     * @param {number} threshold - 阈值
     */
    updateSimilarityThreshold(threshold) {
      const validValue = Math.max(
        0.5,
        Math.min(1.0, Math.floor(threshold * 100) / 100)
      );
      this.similarityThreshold = validValue;
      localStorage.setItem(
        "termMatch_similarity_threshold",
        validValue.toString()
      );

      // 触发事件通知其他组件
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("similarityThresholdChanged", {
            detail: { similarityThreshold: validValue },
          })
        );
      }
    },

    /**
     * 更新Top K值
     * @param {number} topK - Top K值
     */
    updateTopK(topK) {
      const validValue = Math.max(1, Math.min(50, Math.floor(topK)));
      this.topK = validValue;
      localStorage.setItem("termMatch_top_k", validValue.toString());

      // 触发事件通知其他组件
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("topKChanged", {
            detail: { topK: validValue },
          })
        );
      }
    },

    /**
     * 更新最大N-gram值
     * @param {number} maxNGram - 最大N-gram值
     */
    updateMaxNGram(maxNGram) {
      const validValue = Math.max(1, Math.min(5, Math.floor(maxNGram)));
      this.maxNGram = validValue;
      localStorage.setItem("termMatch_max_ngram", validValue.toString());

      // 触发事件通知其他组件
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("maxNGramChanged", {
            detail: { maxNGram: validValue },
          })
        );
      }
    },

    /**
     * 初始化翻译设置
     * 从localStorage加载设置
     */
    initializeTranslationSettings() {
      try {
        // 加载翻译提示设置
        const translationPrompt = localStorage.getItem(
          "translation_prompt_enabled"
        );
        if (translationPrompt !== null) {
          this.translationPrompt = translationPrompt === "true";
        }

        // 加载自动去重设置
        const autoDeduplication = localStorage.getItem(
          "auto_deduplication_enabled"
        );
        if (autoDeduplication !== null) {
          this.autoDeduplication = autoDeduplication === "true";
        }

        // 加载自定义提示
        const customPrompt = localStorage.getItem("custom_translation_prompt");
        if (customPrompt) {
          this.customPrompt = customPrompt;
        }

        // 加载术语匹配参数
        const similarityThreshold = localStorage.getItem(
          "termMatch_similarity_threshold"
        );
        if (similarityThreshold) {
          this.similarityThreshold = parseFloat(similarityThreshold) || 0.7;
        }

        const topK = localStorage.getItem("termMatch_top_k");
        if (topK) {
          this.topK = parseInt(topK) || 10;
        }

        const maxNGram = localStorage.getItem("termMatch_max_ngram");
        if (maxNGram) {
          this.maxNGram = parseInt(maxNGram) || 3;
        }

        // 加载去重项目选择
        const deduplicateProject = localStorage.getItem(
          "deduplicate_project_selection"
        );
        if (deduplicateProject) {
          this.deduplicateProject = deduplicateProject;
        }

        // 加载公共术语库状态
        const adTerms = localStorage.getItem("ad_terms_status");
        if (adTerms !== null) {
          this.adTerms = adTerms === "true";
        }

        // 加载调试日志设置
        const debugLogging = localStorage.getItem("debug_logging_enabled");
        if (debugLogging !== null) {
          this.debugLogging = debugLogging === "true";
        }

        // 加载翻译温度设置
        const translationTemperature = localStorage.getItem(
          "translation_temperature"
        );
        if (translationTemperature) {
          this.translationTemperature =
            parseFloat(translationTemperature) || 0.1;
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
      this.translationPrompt = false;
      this.autoDeduplication = true; // 重置为默认值
      this.customPrompt = DEFAULT_TRANSLATION_PROMPT;
      this.similarityThreshold = 0.7;
      this.topK = 10;
      this.maxNGram = 3;
      this.deduplicateProject = "Common"; // 重置为默认值
      this.isCodeEditing = false;
      this.translationTemperature = 0.1;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 同步重置的设置到localStorage
      localStorage.setItem("translation_prompt_enabled", "false");
      localStorage.setItem("auto_deduplication_enabled", "true");
      localStorage.setItem("deduplicate_project_selection", "Common");
      localStorage.setItem(
        "custom_translation_prompt",
        DEFAULT_TRANSLATION_PROMPT
      );
      localStorage.setItem("termMatch_similarity_threshold", "0.7");
      localStorage.setItem("termMatch_top_k", "10");
      localStorage.setItem("termMatch_max_ngram", "3");
      localStorage.setItem("translation_temperature", "0.1");

      // 注意：不重置 adTerms 和 debugLogging
      // 这些设置需要在缓存清除时保留
    },

    /**
     * 清空翻译设置
     */
    clearTranslationSettings() {
      // 重置到默认值
      this.translationPrompt = false;
      this.autoDeduplication = true;
      this.customPrompt = DEFAULT_TRANSLATION_PROMPT;
      this.similarityThreshold = 0.7;
      this.topK = 10;
      this.maxNGram = 3;
      this.deduplicateProject = "Common";
      this.adTerms = true;
      this.isCodeEditing = false;
      this.translationTemperature = 0.1;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 清空localStorage中的翻译设置
      localStorage.removeItem("translation_prompt_enabled");
      localStorage.removeItem("auto_deduplication_enabled");
      localStorage.removeItem("custom_translation_prompt");
      localStorage.removeItem("termMatch_similarity_threshold");
      localStorage.removeItem("termMatch_top_k");
      localStorage.removeItem("termMatch_max_ngram");
      localStorage.removeItem("deduplicate_project_selection");
      localStorage.removeItem("ad_terms_status");
      localStorage.removeItem("debug_logging_enabled");
      localStorage.removeItem("translation_temperature");
    },

    /**
     * 获取存储键名
     * @param {string} key - 设置键
     * @returns {string} 存储键名
     */
    getStorageKey(key) {
      const storageKeys = {
        translationPrompt: "translation_prompt_enabled",
        autoDeduplication: "auto_deduplication_enabled",
        customPrompt: "custom_translation_prompt",
        similarityThreshold: "termMatch_similarity_threshold",
        topK: "termMatch_top_k",
        maxNGram: "termMatch_max_ngram",
        deduplicateProject: "deduplicate_project_selection",
        adTerms: "ad_terms_status",
        debugLogging: "debug_logging_enabled",
      };
      return storageKeys[key] || null;
    },

    /**
     * 切换调试日志开关
     * @param {boolean} enabled - 是否启用调试日志
     */
    toggleDebugLogging(enabled) {
      this.debugLogging = enabled;
      localStorage.setItem("debug_logging_enabled", enabled.toString());
    },

    /**
     * 更新翻译温度设置
     * @param {number} temperature - 温度值
     */
    updateTranslationTemperature(temperature) {
      // 验证温度值范围
      const validTemperature = Math.max(0, Math.min(2, temperature));
      this.translationTemperature = validTemperature;
      localStorage.setItem(
        "translation_temperature",
        validTemperature.toString()
      );
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

        // 6. 清空翻译缓存
        const cache = useTranslationCache();
        cache.clearCache();

        // 7. 确保重要设置被正确保存到 localStorage
        this.saveImportantSettings();

        // 8. 异步刷新 Terms Card 数据（不等待完成）
        termsStore.refreshTerms(false).catch((error) => {
          console.error("Terms refresh failed after cache clear:", error);
        });

        // 关闭对话框
        this.dialogVisible = false;

        // 调试信息：显示重置后的设置
        debugLog("Cache initialization completed. Settings reset to defaults:");
        debugLog(
          "- auto_deduplication_enabled:",
          localStorage.getItem("auto_deduplication_enabled")
        );
        debugLog(
          "- deduplicate_project_selection:",
          localStorage.getItem("deduplicate_project_selection")
        );
        debugLog("- ad_terms_status:", localStorage.getItem("ad_terms_status"));
        debugLog(
          "- terms-store:",
          localStorage.getItem("terms-store") ? "exists" : "not found"
        );
        debugLog("- Memory autoDeduplication:", this.autoDeduplication);
        debugLog("- Memory deduplicateProject:", this.deduplicateProject);
        debugLog("- Memory adTerms:", this.adTerms);

        ElMessage.success("Cache initialized successfully");

        // 自动校验缓存初始化结果
        this.autoValidateCache();
      } catch (error) {
        console.error("Failed to initialize cache:", error);
        ElMessage.error("Failed to initialize cache");
      }
    },

    /**
     * 保存重要设置到 localStorage
     * 确保重要设置被正确保存（现在只保存debug logging）
     */
    saveImportantSettings() {
      try {
        // 保存调试日志设置（这是唯一需要保留的设置）
        localStorage.setItem(
          "debug_logging_enabled",
          this.debugLogging ? "true" : "false"
        );

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
          autoDeduplication: true, // 重置为默认值
          deduplicateProject: "Common", // 重置为默认值
          adTerms: true, // 重置为默认值
          debugLogging: this.debugLogging, // 保持当前设置
          translationPrompt: false, // 重置为默认值
          customPrompt: DEFAULT_TRANSLATION_PROMPT, // 重置为默认值
          similarityThreshold: 0.7, // 重置为默认值
          topK: 10, // 重置为默认值
          maxNGram: 3, // 重置为默认值
          translationTemperature: 0.1, // 重置为默认值
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
        localStorage.setItem(key, stringValue);
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
    storage: {
      getItem: (key) => {
        if (typeof window !== "undefined" && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem(key);
        }
      },
    },
  },
});
