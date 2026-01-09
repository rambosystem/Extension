/**
 * Terms Data Transformer
 * 负责数据转换和格式化
 */

/**
 * 验证索引状态响应数据
 * @param {Object} data - 响应数据
 * @returns {Object} 转换后的数据（向后兼容）
 */
export function transformEmbeddingStatusResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response format from Term-match Status API");
  }

  if (!data.user_id || typeof data.user_id !== "number") {
    throw new Error("user_id field is missing or invalid");
  }

  if (!data.index_status || typeof data.index_status !== "string") {
    throw new Error("index_status field is missing or invalid");
  }

  if (
    data.last_build_time !== null &&
    data.last_build_time !== undefined &&
    typeof data.last_build_time !== "string"
  ) {
    throw new Error("last_build_time field must be a string or null/undefined");
  }

  // 为了保持向后兼容，将index_status映射为embedding_status
  return {
    user_id: data.user_id,
    embedding_status: data.index_status,
    last_embedding_time: data.last_build_time,
  };
}
