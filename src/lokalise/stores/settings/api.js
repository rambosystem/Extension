import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { t } from "../../../utils/i18n.js";
import { validateDeepSeekApiKey } from "../../../utils/apiValidation.js";
import { STORAGE_KEYS } from "../../config/storageKeys.js";
import {
  getLocalItem,
  piniaLocalStorage,
  removeChromeLocal,
  removeLocalItem,
  setChromeLocal,
  setLocalItem,
} from "../../infrastructure/storage.js";

export const useApiStore = defineStore("api", {
  state: () => ({
    apiKey: "",
    lokaliseApiToken: "",
    loadingStates: {
      apiKey: false,
      lokaliseApiToken: false,
    },
  }),

  getters: {
    hasApiKey: (state) => !!state.apiKey?.trim(),
    hasLokaliseToken: (state) => !!state.lokaliseApiToken?.trim(),
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),
  },

  actions: {
    setLoading(key, loading) {
      if (Object.prototype.hasOwnProperty.call(this.loadingStates, key)) {
        this.loadingStates[key] = loading;
      }
    },

    async withLoading(key, asyncFn) {
      try {
        this.setLoading(key, true);
        return await asyncFn();
      } finally {
        this.setLoading(key, false);
      }
    },

    async saveApiKey(saveData) {
      const { value, onSuccess, onError } = saveData;
      if (!value?.trim()) {
        onError("Please enter API Key");
        return;
      }

      try {
        await this.withLoading("apiKey", async () => {
          const isValid = await validateDeepSeekApiKey(value);
          if (!isValid) throw new Error("API Key is invalid");

          const apiKey = value.trim();
          if (!this.saveToStorage(STORAGE_KEYS.DEEPSEEK_API_KEY, apiKey)) {
            throw new Error("Failed to save API Key");
          }

          this.apiKey = apiKey;
          await setChromeLocal({ [STORAGE_KEYS.DEEPSEEK_API_KEY]: apiKey });
        });

        onSuccess();
      } catch (error) {
        console.error("API Key validation failed:", error);
        onError(error.message || "API Key validation failed");
      }
    },

    async saveApiKeyDirect(apiKey) {
      if (!apiKey?.trim()) {
        throw new Error("Please enter API Key");
      }

      await this.withLoading("apiKey", async () => {
        const isValid = await validateDeepSeekApiKey(apiKey);
        if (!isValid) throw new Error("API Key is invalid");

        const normalizedApiKey = apiKey.trim();
        setLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY, normalizedApiKey);
        this.apiKey = normalizedApiKey;
        await setChromeLocal({ [STORAGE_KEYS.DEEPSEEK_API_KEY]: normalizedApiKey });
      });

      ElMessage.success(t("messages.apiKeySavedSuccessfully"));
    },

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
          }`,
        );
      }

      const responseData = await response.json();
      if (!responseData.projects || !Array.isArray(responseData.projects)) {
        throw new Error("Invalid response format: projects array not found");
      }

      return responseData.projects
        .filter((project) => project && project.project_id && project.name)
        .map((project) => ({
          project_id: project.project_id,
          name: project.name.trim(),
        }));
    },

    async saveLokaliseApiToken(saveData) {
      const { value, onSuccess, onError } = saveData;
      if (!value?.trim()) {
        onError("Please enter Lokalise API Token");
        return;
      }

      try {
        await this.withLoading("lokaliseApiToken", async () => {
          const token = value.trim();
          const projects = await this.validateLokaliseToken(token);

          if (!this.saveToStorage(STORAGE_KEYS.LOKALISE_API_TOKEN, token)) {
            throw new Error("Failed to save API Token");
          }

          try {
            if (!this.saveToStorage(STORAGE_KEYS.LOKALISE_PROJECTS, projects)) {
              throw new Error("Failed to save projects list");
            }
            this.lokaliseApiToken = token;
          } catch (saveError) {
            removeLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN);
            throw saveError;
          }
        });

        onSuccess();
      } catch (error) {
        removeLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN);
        this.lokaliseApiToken = "";
        console.error("Lokalise API Token validation failed:", error);
        onError(error.message || "API Token validation failed");
      }
    },

    async saveLokaliseTokenDirect(token) {
      if (!token?.trim()) {
        throw new Error("Please enter Lokalise API Token");
      }

      try {
        await this.withLoading("lokaliseApiToken", async () => {
          const normalizedToken = token.trim();
          const projects = await this.validateLokaliseToken(normalizedToken);

          setLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN, normalizedToken);

          try {
            setLocalItem(STORAGE_KEYS.LOKALISE_PROJECTS, projects);
            this.lokaliseApiToken = normalizedToken;
          } catch (saveError) {
            removeLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN);
            throw saveError;
          }
        });

        ElMessage.success(t("messages.lokaliseApiTokenSavedSuccessfully"));
      } catch (error) {
        removeLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN);
        this.lokaliseApiToken = "";
        console.error("Lokalise API Token validation failed:", error);
        throw error;
      }
    },

    initializeApiSettings() {
      try {
        const apiKey = getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY, "");
        if (apiKey) {
          this.apiKey = apiKey;
          setChromeLocal({ [STORAGE_KEYS.DEEPSEEK_API_KEY]: apiKey });
        }

        const lokaliseToken = getLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN, "");
        if (lokaliseToken) this.lokaliseApiToken = lokaliseToken;
      } catch (error) {
        console.error("Failed to initialize API settings:", error);
      }
    },

    initializeToDefaults() {
      try {
        removeLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY);
        removeLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN);
        removeLocalItem(STORAGE_KEYS.LOKALISE_PROJECTS);
        removeLocalItem("api-store");
        removeChromeLocal([STORAGE_KEYS.DEEPSEEK_API_KEY]);
      } catch (error) {
        console.error("Failed to clear API settings from localStorage:", error);
      }

      this.apiKey = "";
      this.lokaliseApiToken = "";
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });
    },

    saveToStorage(key, value) {
      return setLocalItem(key, value);
    },
  },

  persist: {
    key: "api-store",
    storage: piniaLocalStorage,
  },
});
