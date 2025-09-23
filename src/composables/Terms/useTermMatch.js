import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { matchTerms } from "../../requests/termMatch.js";
import { useI18n } from "../Core/useI18n.js";

export function useTermMatch() {
  const { t } = useI18n();

  // 从 localStorage 获取保存的相似度阈值，默认为 0.7
  const getStoredSimilarityThreshold = () => {
    try {
      const stored = localStorage.getItem("termMatch_similarity_threshold");
      const value = stored ? parseFloat(stored) : 0.7;
      return isNaN(value) ? 0.7 : Math.max(0.5, Math.min(1.0, value));
    } catch (error) {
      console.error(
        "Failed to get similarity threshold from localStorage:",
        error
      );
      return 0.7;
    }
  };

  // 保存相似度阈值到 localStorage
  const saveSimilarityThreshold = (value) => {
    try {
      localStorage.setItem("termMatch_similarity_threshold", value.toString());
    } catch (error) {
      console.error(
        "Failed to save similarity threshold to localStorage:",
        error
      );
    }
  };

  // 状态管理
  const isMatching = ref(false);
  const matchResults = ref([]);
  const matchError = ref(null);
  const matchOptions = ref({
    similarity_threshold: getStoredSimilarityThreshold(),
    top_k: 10,
    max_ngram: 3,
    user_id: 1, // 默认用户ID
  });

  // 计算属性
  const hasResults = computed(() => matchResults.value.length > 0);
  const totalMatches = computed(() => {
    return matchResults.value.reduce((total, textMatches) => {
      return total + textMatches.length;
    }, 0);
  });

  /**
   * 执行术语匹配
   * @param {Array} texts - 待匹配的文本列表
   * @param {Object} options - 匹配选项（可选）
   * @returns {Promise<Array>} 匹配结果
   */
  const performMatch = async (texts, options = {}) => {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Texts must be a non-empty array");
    }

    isMatching.value = true;
    matchError.value = null;

    try {
      // 合并选项
      const finalOptions = { ...matchOptions.value, ...options };

      // console.log('Starting term matching with options:', finalOptions);
      const results = await matchTerms(texts, finalOptions);

      matchResults.value = results;
      // console.log('Term matching completed:', results);

      return results;
    } catch (error) {
      matchError.value = error.message;
      console.error("Term matching failed:", error);
      ElMessage.error(t("termMatch.matchFailed") || "Term matching failed");
      throw error;
    } finally {
      isMatching.value = false;
    }
  };

  /**
   * 更新匹配选项
   * @param {Object} options - 新的匹配选项
   */
  const updateMatchOptions = (options) => {
    matchOptions.value = { ...matchOptions.value, ...options };

    // 如果更新了 similarity_threshold，保存到 localStorage
    if (options.similarity_threshold !== undefined) {
      saveSimilarityThreshold(options.similarity_threshold);
    }
  };

  /**
   * 更新相似度阈值
   * @param {number} value - 新的相似度阈值
   */
  const updateSimilarityThreshold = (value) => {
    updateMatchOptions({ similarity_threshold: value });
  };

  /**
   * 重置匹配结果
   */
  const resetResults = () => {
    matchResults.value = [];
    matchError.value = null;
  };

  // 组件挂载时初始化
  onMounted(() => {
    // 确保从 localStorage 加载最新的设置
    const storedThreshold = getStoredSimilarityThreshold();
    if (storedThreshold !== matchOptions.value.similarity_threshold) {
      matchOptions.value.similarity_threshold = storedThreshold;
    }

    // 监听相似度阈值变化事件
    const handleSimilarityThresholdChanged = (event) => {
      const { similarityThreshold } = event.detail;
      matchOptions.value.similarity_threshold = similarityThreshold;
    };

    // 监听 top_k 变化事件
    const handleTopKChanged = (event) => {
      const { topK } = event.detail;
      matchOptions.value.top_k = topK;
    };

    // 监听 max_ngram 变化事件
    const handleMaxNGramChanged = (event) => {
      const { maxNGram } = event.detail;
      matchOptions.value.max_ngram = maxNGram;
    };

    // 监听清空缓存事件，重置匹配选项到默认值
    const handleLocalStorageCleared = () => {
      // console.log('LocalStorage cleared, resetting term match options to defaults...');
      matchOptions.value.similarity_threshold = 0.7;
      matchOptions.value.top_k = 10;
      matchOptions.value.max_ngram = 3;
    };

    window.addEventListener(
      "similarityThresholdChanged",
      handleSimilarityThresholdChanged
    );
    window.addEventListener("topKChanged", handleTopKChanged);
    window.addEventListener("maxNGramChanged", handleMaxNGramChanged);
    window.addEventListener("localStorageCleared", handleLocalStorageCleared);

    // 清理事件监听器
    return () => {
      window.removeEventListener(
        "similarityThresholdChanged",
        handleSimilarityThresholdChanged
      );
      window.removeEventListener("topKChanged", handleTopKChanged);
      window.removeEventListener("maxNGramChanged", handleMaxNGramChanged);
      window.removeEventListener(
        "localStorageCleared",
        handleLocalStorageCleared
      );
    };
  });

  return {
    // 状态
    isMatching,
    matchResults,
    matchError,
    matchOptions,

    // 计算属性
    hasResults,
    totalMatches,

    // 方法
    performMatch,
    updateMatchOptions,
    updateSimilarityThreshold,
    resetResults,
  };
}
