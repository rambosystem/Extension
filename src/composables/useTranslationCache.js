import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "./useI18n.js";

const { t } = useI18n();

/**
 * 待翻译文本缓存管理Hook
 * 页面关闭后自动清空缓存
 */
export function useTranslationCache() {
  // 缓存键名
  const CACHE_KEY = "pending_translation_cache";
  
  // 缓存的待翻译文本
  const cachedText = ref("");
  
  // 缓存时间戳
  const cacheTimestamp = ref(null);
  
  // 缓存过期时间（24小时）
  const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

  /**
   * 保存待翻译文本到缓存
   * @param {string} text - 待翻译的文本
   */
  const saveToCache = (text) => {
    try {
      if (!text?.trim()) {
        return;
      }
      
      // 避免保存过短的内容
      if (text.trim().length < 3) {
        return;
      }
      
      const cacheData = {
        text: text.trim(),
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      cachedText.value = text.trim();
      cacheTimestamp.value = Date.now();
      
      console.log("Saved text to cache:", text.trim().substring(0, 50) + "...");
    } catch (error) {
      console.error("Failed to save text to cache:", error);
    }
  };

  /**
   * 从缓存加载待翻译文本
   * @returns {string} 缓存的文本，如果没有则返回空字符串
   */
  const loadFromCache = () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) {
        return "";
      }
      
      const cacheData = JSON.parse(cached);
      
      // 检查缓存是否过期
      if (Date.now() - cacheData.timestamp > CACHE_EXPIRY_TIME) {
        clearCache();
        return "";
      }
      
      // 验证缓存数据的有效性
      if (!cacheData.text || typeof cacheData.text !== 'string') {
        clearCache();
        return "";
      }
      
      cachedText.value = cacheData.text;
      cacheTimestamp.value = cacheData.timestamp;
      
      console.log("Loaded text from cache:", cacheData.text.substring(0, 50) + "...");
      return cacheData.text;
    } catch (error) {
      console.error("Failed to load text from cache:", error);
      clearCache(); // 清除损坏的缓存
      return "";
    }
  };

  /**
   * 清空缓存
   */
  const clearCache = () => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
      cachedText.value = "";
      cacheTimestamp.value = null;
      console.log("Cache cleared");
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  /**
   * 检查是否有缓存的文本
   * @returns {boolean} 是否有缓存的文本
   */
  const hasCachedText = () => {
    return !!cachedText.value;
  };

  /**
   * 获取缓存的文本
   * @returns {string} 缓存的文本
   */
  const getCachedText = () => {
    return cachedText.value;
  };

  /**
   * 页面关闭时清空缓存
   */
  const handleBeforeUnload = () => {
    clearCache();
  };

  /**
   * 页面可见性变化时清空缓存
   */
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // 延迟清空缓存，避免在页面切换时立即清空
      setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          clearCache();
        }
      }, 2000); // 增加延迟时间，确保页面真正关闭
    }
  };

  /**
   * 页面卸载时清空缓存
   */
  const handlePageHide = () => {
    clearCache();
  };

  // 组件挂载时加载缓存
  onMounted(() => {
    loadFromCache();
    
    // 监听页面关闭事件
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 监听页面卸载事件
    window.addEventListener('pagehide', handlePageHide);
  });

  // 组件卸载时清理事件监听器
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
  });

  return {
    // 状态
    cachedText,
    cacheTimestamp,
    
    // 方法
    saveToCache,
    loadFromCache,
    clearCache,
    hasCachedText,
    getCachedText,
  };
} 