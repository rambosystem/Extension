import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { t } from "../../utils/i18n.js";
import { validateDeepSeekApiKey } from "../../utils/apiValidation.js";

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
          if (typeof chrome !== "undefined" && chrome.storage?.local) {
            chrome.storage.local.set({ deepseek_api_key: value.trim() });
          }
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
        // 同步到 chrome.storage，供 content script（划词翻译）读取
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.set({ deepseek_api_key: apiKey.trim() });
        }
      });

      ElMessage.success(t("messages.apiKeySavedSuccessfully"));
    },

    /**
     * 验证Lokalise API Token并获取项目列表
     * @param {string} token - 待验证的API Token
     * @returns {Promise<Array>} 项目列表
     * @throws {Error} 验证失败时抛出错误
     */
    async validateLokaliseToken(token) {
      if (!token?.trim()) {
        throw new Error("Lokalise API token cannot be empty");
      }

      const response = await fetch("https://api.lokalise.com/api2/projects", {
        method: "GET",
        headers: {
          "X-Api-Token": token.trim(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to validate token: ${response.status} ${response.statusText}. ${
            errorData.error?.message || "Please check your token permissions"
          }`
        );
      }

      const responseData = await response.json();

      if (!responseData.projects || !Array.isArray(responseData.projects)) {
        throw new Error("Invalid response format: projects array not found");
      }

      const projectList = responseData.projects
        .filter((project) => project && project.project_id && project.name)
        .map((project) => ({
          project_id: project.project_id,
          name: project.name.trim(),
        }));

      return projectList;
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
          // 先验证 token，验证成功后再保存
          const projects = await this.validateLokaliseToken(value.trim());

          // 验证成功后保存 token 到 localStorage
          const saved = this.saveToStorage("lokalise_api_token", value.trim());
          if (!saved) {
            throw new Error("Failed to save API Token");
          }

          try {
            // 保存项目列表
            const projectsSaved = this.saveToStorage(
              "lokalise_projects",
              projects
            );
            if (!projectsSaved) {
              throw new Error("Failed to save projects list");
            }

            this.lokaliseApiToken = value.trim();
          } catch (saveError) {
            // 如果保存项目列表失败，清除已保存的 token
            localStorage.removeItem("lokalise_api_token");
            throw saveError;
          }
        });

        onSuccess();
      } catch (error) {
        // 验证失败或保存失败时，确保清除可能已保存的 token
        localStorage.removeItem("lokalise_api_token");
        this.lokaliseApiToken = "";
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

      try {
        await this.withLoading("lokaliseApiToken", async () => {
          // 先验证 token，验证成功后再保存
          const projects = await this.validateLokaliseToken(token.trim());

          // 验证成功后保存 token 到 localStorage
          localStorage.setItem("lokalise_api_token", token.trim());

          try {
            // 保存项目列表
            localStorage.setItem("lokalise_projects", JSON.stringify(projects));
            this.lokaliseApiToken = token.trim();
          } catch (saveError) {
            // 如果保存项目列表失败，清除已保存的 token
            localStorage.removeItem("lokalise_api_token");
            throw saveError;
          }
        });

        ElMessage.success(t("messages.lokaliseApiTokenSavedSuccessfully"));
      } catch (error) {
        // 验证失败或保存失败时，确保清除可能已保存的 token
        localStorage.removeItem("lokalise_api_token");
        this.lokaliseApiToken = "";
        console.error("Lokalise API Token validation failed:", error);
        throw error;
      }
    },

    /**
     * 初始化API设置
     * 从localStorage加载设置
     */
    initializeApiSettings() {
      try {
        // 加载API Key
        const apiKey = localStorage.getItem("deepseek_api_key");
        if (apiKey) {
          this.apiKey = apiKey;
          if (typeof chrome !== "undefined" && chrome.storage?.local) {
            chrome.storage.local.set({ deepseek_api_key: apiKey });
          }
        }

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
     * 清除所有API相关的localStorage数据
     *
     * 注意：清除顺序很重要
     * 1. 先清除 localStorage（包括 Pinia persist 存储）
     * 2. 再重置状态，避免 Pinia persist 插件恢复旧数据
     */
    initializeToDefaults() {
      // 先清除localStorage中的API相关数据（包括 Pinia persist 存储）
      // 必须在重置状态之前清除，避免 Pinia persist 插件恢复数据
      try {
        // 清除直接存储的 API 数据
        localStorage.removeItem("deepseek_api_key");
        localStorage.removeItem("lokalise_api_token");
        localStorage.removeItem("lokalise_projects");
        // 清除Pinia persist存储（必须在重置状态之前）
        localStorage.removeItem("api-store");
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.remove(["deepseek_api_key"]);
        }
      } catch (error) {
        console.error("Failed to clear API settings from localStorage:", error);
      }

      // 重置状态（在清除 localStorage 之后）
      // 这样 Pinia persist 插件保存的将是空值
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
