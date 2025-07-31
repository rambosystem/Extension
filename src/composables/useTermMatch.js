import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { matchTerms } from '../requests/termMatch.js';
import { useI18n } from './useI18n.js';

export function useTermMatch() {
  const { t } = useI18n();

  // 状态管理
  const isMatching = ref(false);
  const matchResults = ref([]);
  const matchError = ref(null);
  const matchOptions = ref({
    similarity_threshold: 0.7,
    top_k: 10,
    max_ngram: 3,
    user_id: 1 // 默认用户ID
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
      throw new Error('Texts must be a non-empty array');
    }

    isMatching.value = true;
    matchError.value = null;

    try {
      // 合并选项
      const finalOptions = { ...matchOptions.value, ...options };
      
      console.log('Starting term matching with options:', finalOptions);
      const results = await matchTerms(texts, finalOptions);
      
      matchResults.value = results;
      console.log('Term matching completed:', results);
      
      return results;
    } catch (error) {
      matchError.value = error.message;
      console.error('Term matching failed:', error);
      ElMessage.error(t('termMatch.matchFailed') || 'Term matching failed');
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
  };

  /**
   * 重置匹配结果
   */
  const resetResults = () => {
    matchResults.value = [];
    matchError.value = null;
  };

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
    resetResults
  };
} 