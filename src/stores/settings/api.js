import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { validateDeepSeekApiKey } from "../../utils/apiValidation.js";
import { getUserProjects } from "../../requests/lokalise.js";

/**
 * API 设置管理状态
 * 管理 DeepSeek API Key 和 Lokalise API Token
 */
export const useApiStore = defineStore("api", {
  state: () => ({
    // API 相关设置
    apiKey: "",
    lokaliseApiToken: "",

    // 加载状态
    loadingStates: {
      apiKey: false,
      lokaliseApiToken: false,
    },
  }),

  getters: {
    // 检查API Key是否已配置
    hasApiKey: (state) => !!state.apiKey?.trim(),

    // 检查Lokalise Token是否已配置
    hasLokaliseToken: (state) => !!state.lokaliseApiToken?.trim(),

    // 获取所有加载状态
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),
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
     * 初始化API设置
     * 从localStorage加载设置
     */
    initializeApiSettings() {
      try {
        // 加载API Key
        const apiKey = localStorage.getItem("deepseek_api_key");
        if (apiKey) this.apiKey = apiKey;

        // 加载Lokalise Token
        const lokaliseToken = localStorage.getItem("lokalise_api_token");
        if (lokaliseToken) this.lokaliseApiToken = lokaliseToken;
      } catch (error) {
        console.error("Failed to initialize API settings:", error);
      }
    },

    /**
     * 初始化API设置到默认值
     * 用于缓存清除时重置设置
     */
    initializeToDefaults() {
      this.apiKey = "";
      this.lokaliseApiToken = "";

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });
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
    key: "api-store",
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
