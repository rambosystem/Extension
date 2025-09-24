/**
 * Settings 模块统一导出
 * 提供向后兼容的 API 接口
 */

import { defineStore } from "pinia";
import { useApiStore } from "./api.js";
import { useTranslationSettingsStore } from "./translation.js";
import { ElMessage } from "element-plus";

/**
 * 统一的设置管理 Store
 * 为了保持向后兼容，提供原有的 useSettingsStore 接口
 */
export const useSettingsStore = defineStore("settings", {
  state: () => ({
    // API 相关状态
    apiKey: "",
    lokaliseApiToken: "",
    loadingStates: {
      apiKey: false,
      lokaliseApiToken: false,
      prompt: false,
    },

    // 翻译设置相关状态
    translationPrompt: true,
    autoDeduplication: false,
    customPrompt: "",
    similarityThreshold: 0.7,
    topK: 10,
    maxNGram: 3,
    deduplicateProject: "AmazonSearch",
    adTerms: true,
    isCodeEditing: false,
    dialogVisible: false,
  }),

  getters: {
    // API 相关 getters
    hasApiKey: (state) => !!state.apiKey?.trim(),
    hasLokaliseToken: (state) => !!state.lokaliseApiToken?.trim(),
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 翻译设置相关 getters
    hasUnsavedChanges: (state) => state.isCodeEditing,
  },

  actions: {
    // API 相关方法
    async saveApiKey(saveData) {
      const apiStore = useApiStore();
      return await apiStore.saveApiKey(saveData);
    },

    async saveApiKeyDirect(apiKey) {
      const apiStore = useApiStore();
      return await apiStore.saveApiKeyDirect(apiKey);
    },

    async saveLokaliseApiToken(saveData) {
      const apiStore = useApiStore();
      return await apiStore.saveLokaliseApiToken(saveData);
    },

    async saveLokaliseTokenDirect(token) {
      const apiStore = useApiStore();
      return await apiStore.saveLokaliseTokenDirect(token);
    },

    // 翻译设置相关方法
    async saveCustomPrompt() {
      const translationSettingsStore = useTranslationSettingsStore();
      return await translationSettingsStore.saveCustomPrompt();
    },

    toggleTranslationPrompt(enabled) {
      const translationSettingsStore = useTranslationSettingsStore();
      translationSettingsStore.toggleTranslationPrompt(enabled);
      this.translationPrompt = enabled;
    },

    toggleAutoDeduplication(enabled) {
      const translationSettingsStore = useTranslationSettingsStore();
      translationSettingsStore.toggleAutoDeduplication(enabled);
      this.autoDeduplication = enabled;
    },

    updateSimilarityThreshold(threshold) {
      const translationSettingsStore = useTranslationSettingsStore();
      translationSettingsStore.updateSimilarityThreshold(threshold);
      this.similarityThreshold = threshold;
    },

    updateTopK(topK) {
      const translationSettingsStore = useTranslationSettingsStore();
      translationSettingsStore.updateTopK(topK);
      this.topK = topK;
    },

    updateMaxNGram(maxNGram) {
      const translationSettingsStore = useTranslationSettingsStore();
      translationSettingsStore.updateMaxNGram(maxNGram);
      this.maxNGram = maxNGram;
    },

    updateSetting(key, value) {
      const translationSettingsStore = useTranslationSettingsStore();
      translationSettingsStore.updateSetting(key, value);
      this[key] = value;
    },

    // 通用方法
    setLoading(key, loading) {
      if (this.loadingStates.hasOwnProperty(key)) {
        this.loadingStates[key] = loading;
      }
    },

    async withLoading(key, asyncFn) {
      try {
        this.setLoading(key, true);
        const result = await asyncFn();
        return result;
      } finally {
        this.setLoading(key, false);
      }
    },

    initializeSettings() {
      const apiStore = useApiStore();
      const translationSettingsStore = useTranslationSettingsStore();

      apiStore.initializeApiSettings();
      translationSettingsStore.initializeTranslationSettings();

      // 同步状态到当前 store
      this.apiKey = apiStore.apiKey;
      this.lokaliseApiToken = apiStore.lokaliseApiToken;
      this.translationPrompt = translationSettingsStore.translationPrompt;
      this.autoDeduplication = translationSettingsStore.autoDeduplication;
      this.customPrompt = translationSettingsStore.customPrompt;
      this.similarityThreshold = translationSettingsStore.similarityThreshold;
      this.topK = translationSettingsStore.topK;
      this.maxNGram = translationSettingsStore.maxNGram;
      this.deduplicateProject = translationSettingsStore.deduplicateProject;
      this.adTerms = translationSettingsStore.adTerms;
    },

    clearAllSettings() {
      const apiStore = useApiStore();
      const translationSettingsStore = useTranslationSettingsStore();

      apiStore.clearApiSettings();
      translationSettingsStore.clearTranslationSettings();

      // 重置当前 store 状态
      this.apiKey = "";
      this.lokaliseApiToken = "";
      this.translationPrompt = true;
      this.autoDeduplication = false;
      this.customPrompt = "";
      this.similarityThreshold = 0.7;
      this.topK = 10;
      this.maxNGram = 3;
      this.deduplicateProject = "AmazonSearch";
      this.adTerms = true;
      this.isCodeEditing = false;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      ElMessage.success("All settings cleared successfully");
    },

    loadSettings(storageKeys) {
      const settings = {};
      Object.entries(storageKeys).forEach(([key, storageKey]) => {
        try {
          const value = localStorage.getItem(storageKey);
          if (value !== null) {
            try {
              settings[key] = JSON.parse(value);
            } catch {
              settings[key] = value;
            }
          }
        } catch (error) {
          console.error(`Failed to load ${storageKey}:`, error);
        }
      });
      return settings;
    },

    clearAllStorage() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error("Failed to clear localStorage:", error);
        return false;
      }
    },

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

// 导出各个子 store
export { useApiStore, useTranslationSettingsStore };
