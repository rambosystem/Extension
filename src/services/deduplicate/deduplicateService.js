/**
 * Deduplicate Service
 * 业务逻辑层：负责去重相关的业务逻辑
 */

import { searchKeysByNames as fetchSearchKeysByNames } from "../../api/deduplicate.js";

/**
 * 根据 key_name 列表搜索 keys（大小写敏感）
 * @param {string} projectId - 项目ID
 * @param {Array<string>} keyNames - 要搜索的 key_name 列表
 * @returns {Promise<Object>} 搜索结果
 * @throws {Error} 当API调用失败时抛出错误
 */
export async function searchKeysByNames(projectId, keyNames) {
  const response = await fetchSearchKeysByNames(projectId, keyNames);
  const responseData = await response.json();

  // 验证响应格式
  if (!responseData || typeof responseData !== "object") {
    throw new Error("Invalid response format from API");
  }

  return responseData;
}
