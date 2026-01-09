/**
 * Deduplicate API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

const API_BASE_URL = "http://43.142.250.179:8000";

/**
 * 根据 key_name 列表搜索 keys（大小写敏感）
 * @param {string} projectId - 项目ID
 * @param {Array<string>} keyNames - 要搜索的 key_name 列表
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function searchKeysByNames(projectId, keyNames) {
  if (!projectId || !projectId.trim()) {
    throw new Error("Project ID is required");
  }

  if (!Array.isArray(keyNames) || keyNames.length === 0) {
    throw new Error("Key names array is required and cannot be empty");
  }

  const url = `${API_BASE_URL}/lokalise/search-by-names`;
  const requestBody = {
    project_id: projectId.trim(),
    key_names: keyNames,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = {
        message:
          errorText || `HTTP ${response.status} ${response.statusText}`,
      };
    }
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response;
}
