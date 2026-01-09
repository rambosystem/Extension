/**
 * Autocomplete Service
 * 业务逻辑层：负责自动补全相关的业务逻辑
 */

import {
  fetchAutocompleteKeys,
  fetchAutocompleteTags,
} from "../../api/autocomplete.js";

/**
 * 自动补全查询接口
 * @param {string} projectId - 项目ID
 * @param {string} query - 搜索关键词（前缀）
 * @param {number} limit - 返回结果数量限制，默认5个
 * @returns {Promise<Object>} 自动补全结果
 */
export async function autocompleteKeys(projectId, query, limit = 5) {
  const response = await fetchAutocompleteKeys(projectId, query, limit);
  return await response.json();
}

/**
 * Tag自动补全查询接口 - 智能匹配tag名称，优先显示最近使用的tags
 * 匹配逻辑：前缀匹配 > 包含匹配，完全匹配优先，最近使用的tags优先
 * @param {string} projectId - 项目ID
 * @param {string} query - 搜索关键词（不区分大小写）
 * @param {number} limit - 返回结果数量限制，默认5个，最大20个
 * @returns {Promise<Object>} Tag自动补全结果
 * @returns {Promise<Object>} 返回格式: { success: true, message: string, total_found: number, results: [{ tag: string, count: number }] }
 */
export async function autocompleteTags(projectId, query, limit = 5) {
  const response = await fetchAutocompleteTags(projectId, query, limit);
  return await response.json();
}
