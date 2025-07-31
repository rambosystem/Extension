// terms.js - Terms API 请求管理

const API_BASE_URL = 'http://43.142.250.179:8000';
const Public_Account_ID = '1'

/**
 * 获取用户terms状态信息
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} terms状态数据，包含total_terms、embedding_status、last_embedding_time
 */
export async function fetchUserTermsStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${Public_Account_ID}/terms/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Terms Status API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Terms Status API');
    }

    // 验证必需的字段
    if (typeof data.total_terms !== 'number') {
      throw new Error('total_terms field is missing or invalid');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch user terms status:', error);
    throw error;
  }
}

/**
 * 获取用户terms数据
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} terms数据
 */
export async function fetchUserTerms() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${Public_Account_ID}/terms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Terms API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Terms API');
    }

    if (!Array.isArray(data.terms)) {
      throw new Error('Terms data is not an array');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch user terms:', error);
    throw error;
  }
}

/**
 * 获取当前用户的terms数据
 * @returns {Promise<Object>} terms数据
 */
export async function fetchCurrentUserTerms() {
  return fetchUserTerms();
}

/**
 * 添加新的terms数据
 * @param {Array} termsData - terms数据数组，格式为 [{en: string, cn?: string, jp?: string}]
 * @returns {Promise<Object>} 添加后的terms数据
 */
export async function addUserTerms(termsData) {
  try {
    // 验证输入数据格式
    if (!Array.isArray(termsData)) {
      throw new Error('Terms data must be an array');
    }

    // 验证每个term项的格式
    for (const term of termsData) {
      if (!term || typeof term !== 'object') {
        throw new Error('Each term must be an object');
      }
      if (!term.en || !term.en.trim()) {
        throw new Error('Each term must have a non-empty en property');
      }
    }

    const response = await fetch(`${API_BASE_URL}/users/${Public_Account_ID}/terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(termsData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Add terms API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Add Terms API');
    }

    if (!Array.isArray(data.terms)) {
      throw new Error('Terms data is not an array');
    }

    return data;
  } catch (error) {
    console.error('Failed to add user terms:', error);
    throw error;
  }
}

/**
 * 获取用户embedding状态
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} embedding状态数据
 */
export async function fetchUserEmbeddingStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/embedding/status/${Public_Account_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Embedding Status API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Embedding Status API');
    }

    // 验证必需的字段
    if (!data.user_id || typeof data.user_id !== 'number') {
      throw new Error('user_id field is missing or invalid');
    }

    if (!data.embedding_status || typeof data.embedding_status !== 'string') {
      throw new Error('embedding_status field is missing or invalid');
    }

    if (data.last_embedding_time !== null && data.last_embedding_time !== undefined && typeof data.last_embedding_time !== 'string') {
      throw new Error('last_embedding_time field must be a string or null/undefined');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch user embedding status:', error);
    throw error;
  }
}

/**
 * 重建用户embedding
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 重建任务响应
 */
export async function rebuildUserEmbedding() {
  try {
    const response = await fetch(`${API_BASE_URL}/embedding/build/user/${Public_Account_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // 特殊处理 409 状态码
      if (response.status === 409) {
        throw new Error('Embedding Processing, please try again later');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Rebuild embedding API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Rebuild Embedding API');
    }

    // 验证必需的字段
    if (!data.message || typeof data.message !== 'string') {
      throw new Error('message field is missing or invalid');
    }

    if (!data.user_id || typeof data.user_id !== 'number') {
      throw new Error('user_id field is missing or invalid');
    }

    if (!data.status || typeof data.status !== 'string') {
      throw new Error('status field is missing or invalid');
    }

    return data;
  } catch (error) {
    console.error('Failed to rebuild user embedding:', error);
    throw error;
  }
}

/**
 * 删除单个term数据
 * @param {string} enTerm - 要删除的英文term
 * @returns {Promise<Object>} 删除后的terms数据
 */
export async function deleteUserTerm(enTerm) {
  try {
    // 验证输入参数
    if (!enTerm || typeof enTerm !== 'string' || !enTerm.trim()) {
      throw new Error('English term must be a non-empty string');
    }

    // URL编码英文term，防止特殊字符问题
    const encodedEnTerm = encodeURIComponent(enTerm.trim());

    const response = await fetch(`${API_BASE_URL}/users/${Public_Account_ID}/terms/${encodedEnTerm}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Delete term API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Delete Term API');
    }

    // 删除接口返回成功消息格式
    if (data.message && data.term_id) {
      // 删除成功，返回成功消息
      return {
        success: true,
        message: data.message,
        term_id: data.term_id
      };
    }

    // 如果返回了terms数组，也支持
    if (Array.isArray(data.terms)) {
      return data;
    }

    // 其他情况抛出错误
    throw new Error('Unexpected response format from Delete Term API');
  } catch (error) {
    console.error('Failed to delete user term:', error);
    throw error;
  }
}