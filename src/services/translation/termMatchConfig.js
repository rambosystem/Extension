/**
 * Term Match Config
 * 负责从 localStorage 读取术语匹配配置
 */

/**
 * 从 localStorage 读取术语匹配配置
 * @returns {Object} 配置对象
 */
export function getTermMatchConfig() {
  const getStoredSimilarityThreshold = () => {
    try {
      const stored = localStorage.getItem("termMatch_similarity_threshold");
      const value = stored ? parseFloat(stored) : 0.7;
      return isNaN(value) ? 0.7 : Math.max(0.5, Math.min(1.0, value));
    } catch (error) {
      return 0.7;
    }
  };

  const getStoredTopK = () => {
    try {
      const stored = localStorage.getItem("termMatch_top_k");
      const value = stored ? parseInt(stored) : 10;
      return isNaN(value) ? 10 : Math.max(1, Math.min(50, value));
    } catch (error) {
      return 10;
    }
  };

  const getStoredMaxNGram = () => {
    try {
      const stored = localStorage.getItem("termMatch_max_ngram");
      const value = stored ? parseInt(stored) : 3;
      return isNaN(value) ? 3 : Math.max(1, Math.min(5, value));
    } catch (error) {
      return 3;
    }
  };

  return {
    similarity_threshold: getStoredSimilarityThreshold(),
    top_k: getStoredTopK(),
    max_ngram: getStoredMaxNGram(),
  };
}
