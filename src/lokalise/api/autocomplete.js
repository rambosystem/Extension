/**
 * Autocomplete API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

const API_BASE_URL = "http://43.142.250.179:8000";

/**
 * 自动补全查询接口
 * @param {string} projectId - 项目ID
 * @param {string} query - 搜索关键词（前缀）
 * @param {number} limit - 返回结果数量限制，默认5个
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchAutocompleteKeys(projectId, query, limit = 5) {
  const url = `${API_BASE_URL}/lokalise/autocomplete/keys?project_id=${projectId}&query=${query}&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

/**
 * Tag自动补全查询接口
 * @param {string} projectId - 项目ID
 * @param {string} query - 搜索关键词（不区分大小写）
 * @param {number} limit - 返回结果数量限制，默认5个，最大20个
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchAutocompleteTags(projectId, query, limit = 5) {
  const url = `${API_BASE_URL}/lokalise/autocomplete/tags?project_id=${projectId}&query=${query}&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}
