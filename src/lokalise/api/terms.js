/**
 * Terms API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

const API_BASE_URL = "http://43.142.250.179:8000";
const Public_Account_ID = "1";

/**
 * 获取用户terms状态信息
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchUserTermsStatus() {
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

  return response;
}

/**
 * 获取用户terms数据
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchUserTerms() {
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

  return response;
}

/**
 * 添加新的terms数据
 * @param {Array} termsData - terms数据数组
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function addUserTerms(termsData) {
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

  return response;
}

/**
 * 获取用户索引状态
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchUserEmbeddingStatus() {
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

  return response;
}

/**
 * 重建用户索引
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function rebuildUserEmbedding() {
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

  return response;
}

/**
 * 更新增量索引
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function updateIndex() {
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

  return response;
}

/**
 * 删除term索引
 * @param {Array<number>} termIds - 要删除的term ID列表
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function deleteTermIndex(termIds) {
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

  return response;
}

/**
 * 删除单个term数据
 * @param {number} termId - 要删除的term ID
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function deleteUserTerm(termId) {
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

  return response;
}
