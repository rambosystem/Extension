import { ref } from "vue";

/**
 * 本地存储管理Hook
 */
export function useStorage() {
  /**
   * 保存数据到localStorage
   * @param {string} key - 存储键
   * @param {string} value - 存储值
   */
  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, value.trim());
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
      return false;
    }
  };

  /**
   * 从localStorage获取数据
   * @param {string} key - 存储键
   * @param {string} defaultValue - 默认值
   * @returns {string} - 获取的值或默认值
   */
  const getFromStorage = (key, defaultValue = "") => {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (error) {
      console.error(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  /**
   * 清空所有localStorage数据
   */
  const clearAllStorage = () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
      return false;
    }
  };

  /**
   * 批量加载设置数据
   * @param {Object} storageKeys - 存储键映射对象
   * @returns {Object} - 加载的数据对象
   */
  const loadSettings = (storageKeys) => {
    const settings = {};
    Object.entries(storageKeys).forEach(([key, storageKey]) => {
      settings[key] = getFromStorage(storageKey);
    });
    return settings;
  };

  return {
    saveToStorage,
    getFromStorage,
    clearAllStorage,
    loadSettings,
  };
}
