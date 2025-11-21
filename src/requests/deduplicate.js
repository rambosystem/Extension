// 去重相关API

const API_BASE_URL = "http://43.142.250.179:8000";

/**
 * 根据 key_name 列表搜索 keys（大小写敏感）
 * @param {string} projectId - 项目ID
 * @param {Array<string>} keyNames - 要搜索的 key_name 列表
 * @returns {Promise<Object>} 搜索结果
 * @throws {Error} 当API调用失败时抛出错误
 */
export async function searchKeysByNames(projectId, keyNames) {
  if (!projectId || !projectId.trim()) {
    throw new Error("Project ID is required");
  }

  if (!Array.isArray(keyNames) || keyNames.length === 0) {
    throw new Error("Key names array is required and cannot be empty");
  }

  try {
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

    const responseData = await response.json();

    // 验证响应格式
    if (!responseData || typeof responseData !== "object") {
      throw new Error("Invalid response format from API");
    }

    return responseData;
  } catch (error) {
    console.error("Error searching keys by names:", error);
    throw error;
  }
}
