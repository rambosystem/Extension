import { ref } from "vue";

/**
 * 本地存储管理Hook
 */
export function useStorage() {
  /**
   * 保存数据到localStorage
   * @param {string} key - 存储键
   * @param {any} value - 存储值（字符串或对象）
   */
  const saveToStorage = (key, value) => {
    try {
      // 如果是对象，转换为JSON字符串
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
      return false;
    }
  };

  /**
   * 从localStorage获取数据
   * @param {string} key - 存储键
   * @param {any} defaultValue - 默认值
   * @returns {any} - 获取的值或默认值
   */
  const getFromStorage = (key, defaultValue = "") => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      
      // 尝试解析JSON，如果失败则返回原始字符串
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
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
