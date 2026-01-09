/**
 * Term Match API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

const API_BASE_URL = "http://43.142.250.179:8000";

/**
 * 术语匹配 API 请求
 * @param {string} url - 完整的请求 URL（包含查询参数）
 * @param {Array} texts - 待匹配的文本列表
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchTermMatch(url, texts) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(texts),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Term Match API request failed: ${response.status} ${
        response.statusText
      }. ${errorData.error?.message || errorData.message || ""}`
    );
  }

  return response;
}

/**
 * 重建所有用户的索引 API 请求
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchRebuildAllUserEmbeddings() {
  const response = await fetch(`${API_BASE_URL}/term-match/build/all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // 特殊处理 409 状态码
    if (response.status === 409) {
      throw new Error("Index Processing, please try again later");
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Rebuild all term-match indexes API request failed: ${response.status} ${
        response.statusText
      }. ${errorData.error?.message || errorData.message || ""}`
    );
  }

  return response;
}
