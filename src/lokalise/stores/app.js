import { defineStore } from "pinia";
import { MENU_ORDER, ROUTE_INDEX } from "../../routes/constants.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
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
  [ROUTE_INDEX.CLIPBOARD]: "Clipboard",
  [ROUTE_INDEX.SETTINGS]: "Settings",
  [ROUTE_INDEX.ABOUT]: "About",
};

const VALID_MENU_INDEX = new Set(MENU_ORDER.map((_, i) => String(i + 1)));

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
  }),

  getters: {
    currentMenuName: (state) => MENU_NAME_BY_INDEX[state.currentMenu] || "Unknown",
    isCurrentMenu: (state) => (menuIndex) => state.currentMenu === menuIndex,
  },

  actions: {
    setCurrentMenu(menuIndex) {
      const normalizedMenu = normalizeMenuIndex(menuIndex);
      this.currentMenu = normalizedMenu;
      setChromeLocal({ [STORAGE_KEYS.CURRENT_MENU]: normalizedMenu });
    },

    setLoading(loading) {
      this.isLoading = loading;
    },

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
    },

    async initializeApp() {
      if (this.isInitialized) return;

      try {
        const result = await getChromeLocal([
          STORAGE_KEYS.INITIAL_MENU,
          STORAGE_KEYS.CURRENT_MENU,
        ]);

        const initialMenu = result[STORAGE_KEYS.INITIAL_MENU];
        const currentMenu = result[STORAGE_KEYS.CURRENT_MENU];

        if (initialMenu != null && VALID_MENU_INDEX.has(String(initialMenu))) {
          this.currentMenu = String(initialMenu);
          await removeChromeLocal(STORAGE_KEYS.INITIAL_MENU);
          await setChromeLocal({ [STORAGE_KEYS.CURRENT_MENU]: this.currentMenu });
        } else if (currentMenu != null && VALID_MENU_INDEX.has(String(currentMenu))) {
          this.currentMenu = String(currentMenu);
        }

        this.language = "en";
        setLocalItem(STORAGE_KEYS.APP_LANGUAGE, "en");

        this.isInitialized = true;
      } catch (error) {
        console.error("Failed to initialize app state:", error);
        this.isInitialized = true;
      }
    },
  },

  persist: {
    key: "app-store",
    storage: piniaLocalStorage,
  },
});
