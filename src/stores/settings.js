import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { validateDeepSeekApiKey } from "../utils/apiValidation.js";
import { getUserProjects } from "../requests/lokalise.js";
import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import { useI18n } from "../composables/Core/useI18n.js";

/**
 * 设置管理状态
 * 管理API密钥、翻译设置、术语匹配参数等
 */
export const useSettingsStore = defineStore("settings", {
  state: () => ({
    // API 相关设置
    apiKey: "",
    lokaliseApiToken: "",

    // 翻译相关设置
    translationPrompt: true,
    autoDeduplication: false,
    customPrompt: DEFAULT_TRANSLATION_PROMPT,

    // 术语匹配参数
    similarityThreshold: 0.7,
    topK: 10,
    maxNGram: 3,

    // Excel 导出设置
    excelBaselineKey: "",

    // 去重项目选择
    deduplicateProject: "AmazonSearch",

    // 公共术语库状态
    adTerms: true,

    // 加载状态
    loadingStates: {
      apiKey: false,
      lokaliseApiToken: false,
      prompt: false,
    },

    // 编辑状态
    isCodeEditing: false,

    // 对话框状态
    dialogVisible: false,
  }),

  getters: {
    // 检查API Key是否已配置
    hasApiKey: (state) => !!state.apiKey?.trim(),

    // 检查Lokalise Token是否已配置
    hasLokaliseToken: (state) => !!state.lokaliseApiToken?.trim(),

    // 获取所有加载状态
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 检查是否有未保存的更改
    hasUnsavedChanges: (state) => state.isCodeEditing,
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
     * 异步操作包装器（类似原来的 withState）
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
     * 保存API Key（兼容原有接口）
     * @param {Object} saveData - 保存数据对象 {value, onSuccess, onError}
     */
    async saveApiKey(saveData) {
      const { value, onSuccess, onError } = saveData;

      if (!value?.trim()) {
        onError("Please enter API Key");
        return;
      }

      try {
        await this.withLoading("apiKey", async () => {
          const isValid = await validateDeepSeekApiKey(value);
          if (!isValid) {
            throw new Error("API Key is invalid");
          }

          const saved = this.saveToStorage("deepseek_api_key", value);
          if (!saved) {
            throw new Error("Failed to save API Key");
          }

          this.apiKey = value.trim();
        });

        onSuccess();
      } catch (error) {
        console.error("API Key validation failed:", error);
        onError(error.message || "API Key validation failed");
      }
    },

    /**
     * 直接保存API Key（新接口）
     * @param {string} apiKey - API密钥
     */
    async saveApiKeyDirect(apiKey) {
      if (!apiKey?.trim()) {
        throw new Error("Please enter API Key");
      }

      await this.withLoading("apiKey", async () => {
        const isValid = await validateDeepSeekApiKey(apiKey);
        if (!isValid) {
          throw new Error("API Key is invalid");
        }

        localStorage.setItem("deepseek_api_key", apiKey.trim());
        this.apiKey = apiKey.trim();
      });

      ElMessage.success("API Key saved successfully");
    },

    /**
     * 保存Lokalise API Token（兼容原有接口）
     * @param {Object} saveData - 保存数据对象 {value, onSuccess, onError}
     */
    async saveLokaliseApiToken(saveData) {
      const { value, onSuccess, onError } = saveData;

      if (!value?.trim()) {
        onError("Please enter Lokalise API Token");
        return;
      }

      try {
        await this.withLoading("lokaliseApiToken", async () => {
          // 先保存 API token 到 localStorage，这样 getUserProjects 就能读取到
          const saved = this.saveToStorage("lokalise_api_token", value.trim());
          if (!saved) {
            throw new Error("Failed to save API Token");
          }

          // 调用 getUserProjects 验证 token 并获取项目列表
          const projects = await getUserProjects();

          // 保存项目列表
          const projectsSaved = this.saveToStorage(
            "lokalise_projects",
            projects
          );
          if (!projectsSaved) {
            throw new Error("Failed to save projects list");
          }

          this.lokaliseApiToken = value.trim();
        });

        onSuccess();
      } catch (error) {
        console.error("Lokalise API Token validation failed:", error);
        onError(error.message || "API Token validation failed");
      }
    },

    /**
     * 直接保存Lokalise API Token（新接口）
     * @param {string} token - API Token
     */
    async saveLokaliseTokenDirect(token) {
      if (!token?.trim()) {
        throw new Error("Please enter Lokalise API Token");
      }

      await this.withLoading("lokaliseApiToken", async () => {
        // 先保存到localStorage
        localStorage.setItem("lokalise_api_token", token.trim());

        // 验证token并获取项目列表
        const projects = await getUserProjects();

        // 保存项目列表
        localStorage.setItem("lokalise_projects", JSON.stringify(projects));
        this.lokaliseApiToken = token.trim();
      });

      ElMessage.success("Lokalise API Token saved successfully");
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
     * 更新语言设置
     * @param {string} language - 语言代码
     */
    updateLanguage(language) {
      this.setLanguage(language);
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
     * 清空所有设置
     */
    clearAllSettings() {
      // 清空localStorage
      localStorage.clear();

      // 重置到默认值
      this.apiKey = "";
      this.lokaliseApiToken = "";
      this.translationPrompt = true;
      this.autoDeduplication = false;
      this.customPrompt = DEFAULT_TRANSLATION_PROMPT;
      this.similarityThreshold = 0.7;
      this.topK = 10;
      this.maxNGram = 3;
      this.excelBaselineKey = "";
      this.deduplicateProject = "AmazonSearch";
      this.adTerms = true;
      this.isCodeEditing = false;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      ElMessage.success("All settings cleared successfully");
    },

    /**
     * 初始化设置
     * 从localStorage加载设置
     */
    initializeSettings() {
      try {
        // 加载API Key
        const apiKey = localStorage.getItem("deepseek_api_key");
        if (apiKey) this.apiKey = apiKey;

        // 加载Lokalise Token
        const lokaliseToken = localStorage.getItem("lokalise_api_token");
        if (lokaliseToken) this.lokaliseApiToken = lokaliseToken;

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

        // 加载Excel基线键
        const excelBaselineKey = localStorage.getItem("excel_baseline_key");
        if (excelBaselineKey) {
          this.excelBaselineKey = excelBaselineKey;
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
      } catch (error) {
        console.error("Failed to initialize settings:", error);
      }
    },

    /**
     * 获取存储键名
     * @param {string} key - 设置键
     * @returns {string} 存储键名
     */
    getStorageKey(key) {
      const storageKeys = {
        apiKey: "deepseek_api_key",
        lokaliseApiToken: "lokalise_api_token",
        translationPrompt: "translation_prompt_enabled",
        autoDeduplication: "auto_deduplication_enabled",
        customPrompt: "custom_translation_prompt",
        similarityThreshold: "termMatch_similarity_threshold",
        topK: "termMatch_top_k",
        maxNGram: "termMatch_max_ngram",
        excelBaselineKey: "excel_baseline_key",
        deduplicateProject: "deduplicate_project_selection",
        adTerms: "ad_terms_status",
      };
      return storageKeys[key] || null;
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

    /**
     * 从存储获取
     * @param {string} key - 存储键
     * @param {any} defaultValue - 默认值
     * @returns {any} 获取的值
     */
    getFromStorage(key, defaultValue = "") {
      try {
        const value = localStorage.getItem(key);
        if (value === null) {
          return defaultValue;
        }

        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      } catch (error) {
        console.error(`Failed to get ${key} from localStorage:`, error);
        return defaultValue;
      }
    },

    /**
     * 清空所有存储
     * @returns {boolean} 是否成功
     */
    clearAllStorage() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error("Failed to clear localStorage:", error);
        return false;
      }
    },

    /**
     * 批量加载设置数据
     * @param {Object} storageKeys - 存储键映射对象
     * @returns {Object} 加载的数据对象
     */
    loadSettings(storageKeys) {
      const settings = {};
      Object.entries(storageKeys).forEach(([key, storageKey]) => {
        settings[key] = this.getFromStorage(storageKey);
      });
      return settings;
    },
  },

  // 启用持久化存储
  persist: {
    key: "settings-store",
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
