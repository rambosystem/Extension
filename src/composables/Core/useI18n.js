import { ref, computed, watch } from "vue";
import en from "../../locales/en.json";

// 支持的语言
const SUPPORTED_LANGUAGES = {
  en: "English",
};

// 默认语言
const DEFAULT_LANGUAGE = "en";

// 语言包
const messages = {
  en,
};

// 全局语言状态，确保所有组件共享同一个状态
let globalLanguage = ref(DEFAULT_LANGUAGE);

// 安全地获取存储的语言设置（强制为英文）
const getStoredLanguage = () => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      // 强制设置为英文，忽略存储的语言设置
      localStorage.setItem("app_language", DEFAULT_LANGUAGE);
      return DEFAULT_LANGUAGE;
    }
  } catch (error) {
    console.warn("Failed to access localStorage:", error);
  }
  return DEFAULT_LANGUAGE;
};

// 初始化全局语言状态（强制为英文）
globalLanguage.value = getStoredLanguage();

export function useI18n() {
  // 语言包
  const currentMessages = computed(
    () => messages[globalLanguage.value] || messages[DEFAULT_LANGUAGE]
  );

  /**
   * 切换语言（已废弃，仅支持英文）
   * @param {string} language - 语言代码
   */
  const setLanguage = (language) => {
    // 强制设置为英文
    globalLanguage.value = DEFAULT_LANGUAGE;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("app_language", DEFAULT_LANGUAGE);
      }
    } catch (error) {
      console.warn("Failed to save language to localStorage:", error);
    }
  };

  /**
   * 获取文案
   * @param {string} key - 文案键，支持点号分隔的嵌套键
   * @param {Object|string} params - 参数对象或默认值
   * @param {string} defaultValue - 默认值（当params是对象时使用）
   * @returns {string} 文案内容
   */
  const t = (key, params = "", defaultValue = "") => {
    const keys = key.split(".");
    let value = currentMessages.value;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    // 如果params是对象，进行参数替换
    if (typeof params === "object" && params !== null) {
      let result = value || defaultValue || key;
      Object.keys(params).forEach((paramKey) => {
        const regex = new RegExp(`\\{${paramKey}\\}`, "g");
        result = result.replace(regex, params[paramKey]);
      });
      return result;
    }

    // 如果params是字符串，作为默认值处理
    return value || params || defaultValue || key;
  };

  /**
   * 获取支持的语言列表
   * @returns {Object} 语言列表
   */
  const getSupportedLanguages = () => SUPPORTED_LANGUAGES;

  /**
   * 获取当前语言名称
   * @returns {string} 当前语言名称
   */
  const getCurrentLanguageName = () =>
    SUPPORTED_LANGUAGES[globalLanguage.value];

  /**
   * 检查是否为指定语言
   * @param {string} language - 语言代码
   * @returns {boolean} 是否为指定语言
   */
  const isLanguage = (language) => globalLanguage.value === language;

  // 监听localStorage变化（强制为英文）
  const handleStorageChange = (e) => {
    if (e.key === "app_language" && e.newValue) {
      // 强制设置为英文
      globalLanguage.value = DEFAULT_LANGUAGE;
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("app_language", DEFAULT_LANGUAGE);
      }
    }
  };

  // 监听自定义语言变化事件（强制为英文）
  const handleLanguageChanged = (e) => {
    if (e.detail && e.detail.language) {
      // 强制设置为英文
      globalLanguage.value = DEFAULT_LANGUAGE;
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("app_language", DEFAULT_LANGUAGE);
      }
    }
  };

  // 添加事件监听
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("languageChanged", handleLanguageChanged);
  }

  return {
    // 状态
    currentLanguage: globalLanguage,
    currentMessages,

    // 方法
    t,
    setLanguage,
    getSupportedLanguages,
    getCurrentLanguageName,
    isLanguage,

    // 常量
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
  };
}
