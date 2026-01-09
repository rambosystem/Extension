/**
 * Lokalise API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

const LOKALISE_API_BASE_URL = "https://api.lokalise.com/api2";

/**
 * 获取用户项目列表
 * @param {string} apiToken - API Token
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchUserProjects(apiToken) {
  const response = await fetch(`${LOKALISE_API_BASE_URL}/projects`, {
    method: "GET",
    headers: {
      "X-Api-Token": apiToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch projects: ${response.status} ${response.statusText}. ${
        errorData.error?.message || ""
      }`
    );
  }

  return response;
}

/**
 * 验证 API Token 是否有效
 * @param {string} apiToken - API Token
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function validateApiToken(apiToken) {
  const response = await fetch(`${LOKALISE_API_BASE_URL}/projects`, {
    method: "GET",
    headers: {
      "X-Api-Token": apiToken,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Invalid API token: ${
        errorData.error?.message || "Please check your token permissions"
      }`
    );
  }

  return response;
}

/**
 * 上传翻译键值到 Lokalise 项目
 * @param {string} apiToken - API Token
 * @param {string} projectId - 项目ID
 * @param {Object} requestBody - 请求体
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function uploadKeys(apiToken, projectId, requestBody) {
  const response = await fetch(
    `${LOKALISE_API_BASE_URL}/projects/${projectId}/keys`,
    {
      method: "POST",
      headers: {
        "X-Api-Token": apiToken.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = {};
    }

    throw new Error(
      `Upload failed: ${
        errorData.error?.message ||
        `HTTP ${response.status} ${response.statusText}`
      }`
    );
  }

  return response;
}
