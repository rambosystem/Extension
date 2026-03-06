/**
 * app.js - 应用全局状态（菜单索引校验 + 存储收口）
 * 当前菜单、语言、默认项目 ID 等；菜单索引写入前校验合法性，持久化通过 chrome.storage + piniaLocalStorage 收口。
 * 默认项目（defaultProjectId）由此 store 持有，持久化由 projectRepository 统一读写。
 */

import { defineStore } from "pinia";
import { MENU_ORDER, ROUTE_INDEX } from "@/routes/constants.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import {
  getDefaultProjectId,
  initializeDefaultProjectIdFromProjects,
  setDefaultProjectId as setDefaultProjectIdInStorage,
} from "../repositories/projectRepository.js";
import {
  getChromeLocal,
  piniaLocalStorage,
  removeChromeLocal,
  setChromeLocal,
  setLocalItem,
} from "../infrastructure/storage.js";

const MENU_NAME_BY_INDEX = {
  [ROUTE_INDEX.LOKALISE]: "Lokalise",
  [ROUTE_INDEX.TRANSLATE]: "Translate",
  [ROUTE_INDEX.CLIPBOARD]: "Favorites",
  [ROUTE_INDEX.SETTINGS]: "Settings",
  [ROUTE_INDEX.ABOUT]: "About",
};

/** 合法菜单索引集合（用于校验） */
const VALID_MENU_INDEX = new Set(MENU_ORDER.map((_, i) => String(i + 1)));

/**
 * 将菜单索引规范为合法值，非法则回退到 Lokalise
 * @param {string|number} menuIndex
 * @returns {string}
 */
function normalizeMenuIndex(menuIndex) {
  const normalized = String(menuIndex ?? "");
  return VALID_MENU_INDEX.has(normalized) ? normalized : ROUTE_INDEX.LOKALISE;
}

export const useAppStore = defineStore("app", {
  state: () => ({
    currentMenu: ROUTE_INDEX.LOKALISE,
    language: "en",
    isLoading: false,
    isInitialized: false,
    /** 全局默认项目 ID，持久化由 projectRepository 读写 */
    defaultProjectId: "",
  }),

  getters: {
    currentMenuName: (state) =>
      MENU_NAME_BY_INDEX[state.currentMenu] || "Unknown",
    isCurrentMenu: (state) => (menuIndex) => state.currentMenu === menuIndex,
  },

  actions: {
    /**
     * 设置当前菜单（写入前校验索引，并同步到 chrome.storage）
     * @param {string|number} menuIndex
     */
    setCurrentMenu(menuIndex) {
      const normalizedMenu = normalizeMenuIndex(menuIndex);
      this.currentMenu = normalizedMenu;
      setChromeLocal({ [STORAGE_KEYS.CURRENT_MENU]: normalizedMenu });
    },

    /** 设置全局加载状态 */
    setLoading(loading) {
      this.isLoading = loading;
    },

    /** 重置为默认值（语言、菜单、默认项目等），用于缓存清除 */
    initializeToDefaults() {
      this.language = "en";
      setLocalItem(STORAGE_KEYS.APP_LANGUAGE, "en");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("languageChanged", {
            detail: { language: "en" },
          }),
        );
      }

      this.isLoading = false;
      this.isInitialized = false;
      setDefaultProjectIdInStorage("");
      this.defaultProjectId = "";
    },

    /**
     * 设置全局默认项目 ID（同步到 projectRepository）
     * @param {string} projectId
     */
    setDefaultProjectId(projectId) {
      const value = projectId?.trim() ? projectId.trim() : "";
      this.defaultProjectId = value;
      setDefaultProjectIdInStorage(value || null);
    },

    /**
     * 从 chrome.storage 恢复菜单等状态，并做索引校验
     * 每次进入选项页都先应用 initialMenu/currentMenu（popup 点 Setting 跳转依赖此），再按需做其余初始化
     */
    async initializeApp() {
      try {
        // 始终先读取并应用菜单定位（解决 persist 导致 isInitialized 为 true 时跳过、始终进 Lokalise 的问题）
        const result = await getChromeLocal([
          STORAGE_KEYS.INITIAL_MENU,
          STORAGE_KEYS.CURRENT_MENU,
        ]);
        const initialMenu = result[STORAGE_KEYS.INITIAL_MENU];
        const currentMenu = result[STORAGE_KEYS.CURRENT_MENU];
        if (initialMenu != null && VALID_MENU_INDEX.has(String(initialMenu))) {
          this.currentMenu = String(initialMenu);
          await removeChromeLocal(STORAGE_KEYS.INITIAL_MENU);
          await setChromeLocal({
            [STORAGE_KEYS.CURRENT_MENU]: this.currentMenu,
          });
        } else if (
          currentMenu != null &&
          VALID_MENU_INDEX.has(String(currentMenu))
        ) {
          this.currentMenu = String(currentMenu);
        }

        if (this.isInitialized) return;

        this.language = "en";
        setLocalItem(STORAGE_KEYS.APP_LANGUAGE, "en");

        const storedDefaultProjectId = getDefaultProjectId() || "";
        if (storedDefaultProjectId) {
          this.defaultProjectId = storedDefaultProjectId;
        } else {
          const firstProjectId = initializeDefaultProjectIdFromProjects();
          this.defaultProjectId = firstProjectId || "";
        }

        this.isInitialized = true;
      } catch (error) {
        console.error("Failed to initialize app state:", error);
        this.isInitialized = true;
      }
    },
  },

  /** 持久化：使用 storage 适配层，与其它 store 一致 */
  persist: {
    key: "app-store",
    storage: piniaLocalStorage,
  },
});
