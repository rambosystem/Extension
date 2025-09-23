// terms.js - Terms API 请求管理

const API_BASE_URL = "http://43.142.250.179:8000";
const Public_Account_ID = "1";

/**
 * 获取用户terms状态信息
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} terms状态数据，包含total_terms、index_status、last_build_time
 */
export async function fetchUserTermsStatus() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${Public_Account_ID}/terms/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Terms Status API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Terms Status API");
    }

    // 验证必需的字段
    if (typeof data.total_terms !== "number") {
      throw new Error("total_terms field is missing or invalid");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user terms status:", error);
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
    const response = await fetch(
      `${API_BASE_URL}/users/${Public_Account_ID}/terms`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Terms API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ""
        }`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Terms API");
    }

    if (!Array.isArray(data.terms)) {
      throw new Error("Terms data is not an array");
    }

    // 验证每个term对象的格式
    for (let i = 0; i < data.terms.length; i++) {
      const term = data.terms[i];
      if (!term || typeof term !== "object") {
        throw new Error(`Term at index ${i} is not an object`);
      }

      // 验证必需的字段
      if (typeof term.term_id !== "number") {
        throw new Error(`term_id field is missing or invalid at index ${i}`);
      }
      if (!term.en || typeof term.en !== "string") {
        throw new Error(`en field is missing or invalid at index ${i}`);
      }

      // 验证可选字段（如果存在）
      if (term.cn !== undefined && typeof term.cn !== "string") {
        throw new Error(`cn field must be a string at index ${i}`);
      }
      if (term.jp !== undefined && typeof term.jp !== "string") {
        throw new Error(`jp field must be a string at index ${i}`);
      }
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user terms:", error);
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
      throw new Error("Terms data must be an array");
    }

    // 验证每个term项的格式
    for (const term of termsData) {
      if (!term || typeof term !== "object") {
        throw new Error("Each term must be an object");
      }
      if (!term.en || !term.en.trim()) {
        throw new Error("Each term must have a non-empty en property");
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/users/${Public_Account_ID}/terms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(termsData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Add terms API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Add Terms API");
    }

    if (!Array.isArray(data.terms)) {
      throw new Error("Terms data is not an array");
    }

    // 验证每个term对象的格式
    for (let i = 0; i < data.terms.length; i++) {
      const term = data.terms[i];
      if (!term || typeof term !== "object") {
        throw new Error(`Term at index ${i} is not an object`);
      }

      // 验证必需的字段
      if (typeof term.term_id !== "number") {
        throw new Error(`term_id field is missing or invalid at index ${i}`);
      }
      if (!term.en || typeof term.en !== "string") {
        throw new Error(`en field is missing or invalid at index ${i}`);
      }

      // 验证可选字段（如果存在）
      if (term.cn !== undefined && typeof term.cn !== "string") {
        throw new Error(`cn field must be a string at index ${i}`);
      }
      if (term.jp !== undefined && typeof term.jp !== "string") {
        throw new Error(`jp field must be a string at index ${i}`);
      }
    }

    return data;
  } catch (error) {
    console.error("Failed to add user terms:", error);
    throw error;
  }
}

/**
 * 获取用户索引状态
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 索引状态数据
 */
export async function fetchUserEmbeddingStatus() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/term-match/status/${Public_Account_ID}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Term-match Status API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Term-match Status API");
    }

    // 验证必需的字段
    if (!data.user_id || typeof data.user_id !== "number") {
      throw new Error("user_id field is missing or invalid");
    }

    // 新API使用index_status而不是embedding_status
    if (!data.index_status || typeof data.index_status !== "string") {
      throw new Error("index_status field is missing or invalid");
    }

    if (
      data.last_build_time !== null &&
      data.last_build_time !== undefined &&
      typeof data.last_build_time !== "string"
    ) {
      throw new Error(
        "last_build_time field must be a string or null/undefined"
      );
    }

    // 为了保持向后兼容，将index_status映射为embedding_status
    return {
      user_id: data.user_id,
      embedding_status: data.index_status,
      last_embedding_time: data.last_build_time,
    };
  } catch (error) {
    console.error("Failed to fetch user embedding status:", error);
    throw error;
  }
}

/**
 * 重建用户索引
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 重建任务响应
 */
export async function rebuildUserEmbedding() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/term-match/build/user/${Public_Account_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      // 特殊处理 409 状态码
      if (response.status === 409) {
        throw new Error("Index Processing, please try again later");
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Rebuild term-match index API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error(
        "Invalid response format from Rebuild Term-match Index API"
      );
    }

    // 验证必需的字段
    if (!data.message || typeof data.message !== "string") {
      throw new Error("message field is missing or invalid");
    }

    if (!data.user_id || typeof data.user_id !== "number") {
      throw new Error("user_id field is missing or invalid");
    }

    if (!data.status || typeof data.status !== "string") {
      throw new Error("status field is missing or invalid");
    }

    return data;
  } catch (error) {
    console.error("Failed to rebuild user embedding:", error);
    throw error;
  }
}

/**
 * 更新增量索引
 * @returns {Promise<Object>} 更新索引响应
 */
export async function updateIndex() {
  try {
    const response = await fetch(`${API_BASE_URL}/term-match/update-index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Update Index API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Update Index API");
    }

    return data;
  } catch (error) {
    console.error("Failed to update index:", error);
    throw error;
  }
}

/**
 * 删除term索引
 * @param {Array<number>} termIds - 要删除的term ID列表
 * @returns {Promise<Object>} 删除索引响应
 */
export async function deleteTermIndex(termIds) {
  try {
    // 验证输入参数
    if (!Array.isArray(termIds)) {
      throw new Error("Term IDs must be an array");
    }

    // 验证每个term ID
    for (let i = 0; i < termIds.length; i++) {
      if (typeof termIds[i] !== "number" || termIds[i] <= 0) {
        throw new Error(`Term ID at index ${i} must be a positive number`);
      }
    }

    const response = await fetch(`${API_BASE_URL}/term-match/terms`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(termIds),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Delete Term Index API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Delete Term Index API");
    }

    return data;
  } catch (error) {
    console.error("Failed to delete term index:", error);
    throw error;
  }
}

/**
 * 删除单个term数据
 * @param {number} termId - 要删除的term ID
 * @returns {Promise<Object>} 删除后的terms数据
 */
export async function deleteUserTerm(termId) {
  try {
    // 验证输入参数
    if (typeof termId !== "number" || termId <= 0) {
      throw new Error("Term ID must be a positive number");
    }

    const response = await fetch(
      `${API_BASE_URL}/users/${Public_Account_ID}/terms/${termId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Delete term API request failed: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || errorData.message || ""}`
      );
    }

    const data = await response.json();

    // 验证返回的数据格式
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Delete Term API");
    }

    // 删除接口返回成功消息格式
    if (data.message && data.term_id) {
      // 删除成功，返回成功消息
      return {
        success: true,
        message: data.message,
        term_id: data.term_id,
      };
    }

    // 如果返回了terms数组，也支持
    if (Array.isArray(data.terms)) {
      return data;
    }

    // 其他情况抛出错误
    throw new Error("Unexpected response format from Delete Term API");
  } catch (error) {
    console.error("Failed to delete user term:", error);
    throw error;
  }
}
