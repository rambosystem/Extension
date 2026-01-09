/**
 * Terms Service
 * 主服务函数：负责术语相关的业务逻辑
 */

import {
  fetchUserTermsStatus as fetchUserTermsStatusAPI,
  fetchUserTerms as fetchUserTermsAPI,
  addUserTerms as addUserTermsAPI,
  fetchUserEmbeddingStatus as fetchUserEmbeddingStatusAPI,
  rebuildUserEmbedding as rebuildUserEmbeddingAPI,
  updateIndex as updateIndexAPI,
  deleteTermIndex as deleteTermIndexAPI,
  deleteUserTerm as deleteUserTermAPI,
} from "../../api/terms.js";
import {
  validateTermsStatusResponse,
  validateTermsResponse,
  validateAddTermsInput,
  validateDeleteTermIndexInput,
  validateDeleteTermInput,
  validateRebuildResponse,
} from "./validators.js";
import { transformEmbeddingStatusResponse } from "./dataTransformer.js";

/**
 * 获取用户terms状态信息
 * @returns {Promise<Object>} terms状态数据，包含total_terms、index_status、last_build_time
 */
export async function fetchUserTermsStatus() {
  try {
    const response = await fetchUserTermsStatusAPI();
    const data = await response.json();

    validateTermsStatusResponse(data);

    return data;
  } catch (error) {
    console.error("Failed to fetch user terms status:", error);
    throw error;
  }
}

/**
 * 获取用户terms数据
 * @returns {Promise<Object>} terms数据
 */
export async function fetchUserTerms() {
  try {
    const response = await fetchUserTermsAPI();
    const data = await response.json();

    validateTermsResponse(data);

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
    validateAddTermsInput(termsData);

    // 调用 API
    const response = await addUserTermsAPI(termsData);
    const data = await response.json();

    // 验证返回的数据格式
    validateTermsResponse(data);

    // 添加术语成功后，更新索引
    try {
      await updateIndex();
    } catch (indexError) {
      console.warn("Failed to update index after adding terms:", indexError);
      // 不抛出错误，因为添加术语已经成功
    }

    return data;
  } catch (error) {
    console.error("Failed to add user terms:", error);
    throw error;
  }
}

/**
 * 获取用户索引状态
 * @returns {Promise<Object>} 索引状态数据
 */
export async function fetchUserEmbeddingStatus() {
  try {
    const response = await fetchUserEmbeddingStatusAPI();
    const data = await response.json();

    return transformEmbeddingStatusResponse(data);
  } catch (error) {
    console.error("Failed to fetch user embedding status:", error);
    throw error;
  }
}

/**
 * 重建用户索引
 * @returns {Promise<Object>} 重建任务响应
 */
export async function rebuildUserEmbedding() {
  try {
    const response = await rebuildUserEmbeddingAPI();
    const data = await response.json();

    validateRebuildResponse(data);

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
    const response = await updateIndexAPI();
    const data = await response.json();

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
    validateDeleteTermIndexInput(termIds);

    // 调用 API
    const response = await deleteTermIndexAPI(termIds);
    const data = await response.json();

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
    validateDeleteTermInput(termId);

    // 调用 API
    const response = await deleteUserTermAPI(termId);
    const data = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Delete Term API");
    }

    // 删除接口返回成功消息格式
    if (data.message && data.term_id) {
      // 删除成功后，更新索引
      try {
        await updateIndex();
      } catch (indexError) {
        console.warn("Failed to update index after deleting term:", indexError);
        // 不抛出错误，因为删除术语已经成功
      }

      return {
        success: true,
        message: data.message,
        term_id: data.term_id,
      };
    }

    // 如果返回了terms数组，也支持
    if (Array.isArray(data.terms)) {
      // 删除成功后，更新索引
      try {
        await updateIndex();
      } catch (indexError) {
        console.warn("Failed to update index after deleting term:", indexError);
        // 不抛出错误，因为删除术语已经成功
      }

      return data;
    }

    // 其他情况抛出错误
    throw new Error("Unexpected response format from Delete Term API");
  } catch (error) {
    console.error("Failed to delete user term:", error);
    throw error;
  }
}
