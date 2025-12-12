import { defineStore } from "pinia";

/**
 * 应用全局状态管理
 * 管理菜单选择、语言设置等全局状态
 */
export const useAppStore = defineStore("app", {
  state: () => ({
    // 选中的菜单项
    currentMenu: "1", // 默认选中Translation菜单

    // 应用语言设置
    language: "en", // 默认英语

    // 全局加载状态
    isLoading: false,

    // 应用初始化状态
    isInitialized: false,
  }),

  getters: {
    // 获取菜单的显示名称
    currentMenuName: (state) => {
      const menuNames = {
        1: "Translation",
        2: "Library",
        3: "Settings",
        4: "About",
      };
      return menuNames[state.currentMenu] || "Unknown";
    },

    // 检查是否为指定菜单
    isCurrentMenu: (state) => (menuIndex) => {
      return state.currentMenu === menuIndex;
    },
  },

  actions: {
    /**
     * 设置当前菜单
     * @param {string} menuIndex - 菜单索引
     */
    setCurrentMenu(menuIndex) {
      this.currentMenu = menuIndex;

      // 保存到Chrome存储
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ currentMenu: menuIndex });
      }
    },

    /**
     * 设置应用语言
     * @param {string} lang - 语言代码
     */
    setLanguage(lang) {
      this.language = lang;

      // 保存到localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("app_language", lang);
      }

      // 触发语言变化事件
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("languageChanged", {
            detail: { language: lang },
          })
        );
      }
    },

    /**
     * 设置全局加载状态
     * @param {boolean} loading - 加载状态
     */
    setLoading(loading) {
      this.isLoading = loading;
    },

    /**
     * 初始化应用状态到默认值
     * 用于缓存清除时重置状态
     */
    initializeToDefaults() {
      // 注意：不重置 currentMenu，保持当前菜单选择
      this.setLanguage("en"); // 使用setLanguage方法确保触发事件
      this.isLoading = false;
      this.isInitialized = false;
    },

    /**
     * 初始化应用状态
     * 从存储中恢复状态
     */
    async initializeApp() {
      if (this.isInitialized) return;

      try {
        // 从Chrome存储恢复菜单状态
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await new Promise((resolve) => {
            chrome.storage.local.get(["initialMenu", "currentMenu"], resolve);
          });

          if (result.initialMenu) {
            // 优先使用从popup传递的菜单
            const menuIndex =
              result.initialMenu === "1" ? "1" : result.initialMenu;
            this.currentMenu = menuIndex;
            // 读取后删除，避免刷新时重复选中
            chrome.storage.local.remove("initialMenu");
            chrome.storage.local.set({ currentMenu: menuIndex });
          } else if (result.currentMenu) {
            // 使用上次保存的菜单
            const menuIndex =
              result.currentMenu === "1" ? "1" : result.currentMenu;
            this.currentMenu = menuIndex;
          }
        }

        // 从localStorage恢复语言设置
        if (typeof window !== "undefined" && window.localStorage) {
          const storedLanguage = localStorage.getItem("app_language");
          if (storedLanguage) {
            this.language = storedLanguage;
          }
        }

        this.isInitialized = true;
      } catch (error) {
        console.error("Failed to initialize app state:", error);
        this.isInitialized = true; // 即使失败也标记为已初始化
      }
    },
  },

  // 启用持久化存储
  persist: {
    key: "app-store",
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
