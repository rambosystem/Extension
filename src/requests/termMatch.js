// termMatch.js - Term Match API 请求管理

const API_BASE_URL = 'http://43.142.250.179:8000';

/**
 * 术语匹配
 * @param {Array} texts - 待匹配的文本列表
 * @param {Object} options - 匹配选项
 * @param {number} options.similarity_threshold - 相似度阈值 (0.0-1.0, 默认 0.7)
 * @param {number} options.top_k - 每个文本返回的最大匹配数 (1-50, 默认 10)
 * @param {number} options.max_ngram - 最大N-gram长度 (1-5, 默认 3)
 * @param {number} options.user_id - 限制搜索特定用户的术语
 * @returns {Promise<Array>} 匹配结果列表，每个输入文本对应一个术语列表
 */
export async function matchTerms(texts, options = {}) {
  try {
    // 验证输入参数
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    // 验证每个文本项
    for (const text of texts) {
      if (!text || typeof text !== 'string' || !text.trim()) {
        throw new Error('Each text must be a non-empty string');
      }
    }

    // 构建查询参数
    const queryParams = new URLSearchParams();
    
    if (options.similarity_threshold !== undefined) {
      if (typeof options.similarity_threshold !== 'number' || 
          options.similarity_threshold < 0.0 || 
          options.similarity_threshold > 1.0) {
        throw new Error('similarity_threshold must be a number between 0.0 and 1.0');
      }
      queryParams.append('similarity_threshold', options.similarity_threshold.toString());
    }

    if (options.top_k !== undefined) {
      if (!Number.isInteger(options.top_k) || 
          options.top_k < 1 || 
          options.top_k > 50) {
        throw new Error('top_k must be an integer between 1 and 50');
      }
      queryParams.append('top_k', options.top_k.toString());
    }

    if (options.max_ngram !== undefined) {
      if (!Number.isInteger(options.max_ngram) || 
          options.max_ngram < 1 || 
          options.max_ngram > 5) {
        throw new Error('max_ngram must be an integer between 1 and 5');
      }
      queryParams.append('max_ngram', options.max_ngram.toString());
    }

    if (options.user_id !== undefined) {
      if (!Number.isInteger(options.user_id) || options.user_id <= 0) {
        throw new Error('user_id must be a positive integer');
      }
      queryParams.append('user_id', options.user_id.toString());
    }

    // 构建请求URL
    const url = `${API_BASE_URL}/term-match/match${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(texts),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Term Match API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from Term Match API');
    }

    // 验证每个匹配结果
    for (let i = 0; i < data.length; i++) {
      const textMatches = data[i];
      if (!Array.isArray(textMatches)) {
        throw new Error(`Invalid match result format for text ${i}`);
      }

      // 验证每个匹配的术语
      for (const match of textMatches) {
        if (!match || typeof match !== 'object') {
          throw new Error(`Invalid term match format for text ${i}`);
        }

        // 验证必需的字段
        if (!match.term_id || typeof match.term_id !== 'number') {
          throw new Error(`term_id field is missing or invalid for text ${i}`);
        }

        if (!match.en || typeof match.en !== 'string') {
          throw new Error(`en field is missing or invalid for text ${i}`);
        }

        if (!match.user_id || typeof match.user_id !== 'number') {
          throw new Error(`user_id field is missing or invalid for text ${i}`);
        }
      }
    }

    return data;
  } catch (error) {
    console.error('Failed to match terms:', error);
    throw error;
  }
} 