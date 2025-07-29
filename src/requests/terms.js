// terms.js - Terms API 请求管理

const API_BASE_URL = 'http://43.142.250.179:8000';
const Public_Account_ID = '1'

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
 * @param {Array} termsData - terms数据数组，格式为 [{en: string, cn: string, jp: string}]
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
      if (!term.en || !term.cn || !term.jp) {
        throw new Error('Each term must have en, cn, and jp properties');
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