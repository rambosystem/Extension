// terms.js - Terms API 请求管理

const API_BASE_URL = 'http://43.142.250.179:8000';

/**
 * 获取用户terms数据
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} terms数据
 */
export async function fetchUserTerms(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/terms`, {
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
  // 从localStorage获取用户ID，如果没有则使用默认值
  const userId = localStorage.getItem('user_id') || '1';
  return fetchUserTerms(userId);
} 