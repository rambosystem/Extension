/**
 * Terms Validators
 * 负责验证术语相关的输入和响应数据
 */

/**
 * 验证术语状态响应数据
 * @param {Object} data - 响应数据
 * @throws {Error} 当数据格式无效时抛出错误
 */
export function validateTermsStatusResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response format from Terms Status API");
  }

  if (typeof data.total_terms !== "number") {
    throw new Error("total_terms field is missing or invalid");
  }
}

/**
 * 验证术语数据响应
 * @param {Object} data - 响应数据
 * @throws {Error} 当数据格式无效时抛出错误
 */
export function validateTermsResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response format from Terms API");
  }

  if (!Array.isArray(data.terms)) {
    throw new Error("Terms data is not an array");
  }

  // 验证每个term对象的格式
  for (let i = 0; i < data.terms.length; i++) {
    const term = data.terms[i];
    if (!term || typeof term !== "object") {
      throw new Error(`Term at index ${i} is not an object`);
    }

    if (typeof term.term_id !== "number") {
      throw new Error(`term_id field is missing or invalid at index ${i}`);
    }
    if (!term.en || typeof term.en !== "string") {
      throw new Error(`en field is missing or invalid at index ${i}`);
    }

    if (term.cn !== undefined && typeof term.cn !== "string") {
      throw new Error(`cn field must be a string at index ${i}`);
    }
    if (term.jp !== undefined && typeof term.jp !== "string") {
      throw new Error(`jp field must be a string at index ${i}`);
    }
  }
}

/**
 * 验证添加术语的输入数据
 * @param {Array} termsData - terms数据数组
 * @throws {Error} 当数据格式无效时抛出错误
 */
export function validateAddTermsInput(termsData) {
  if (!Array.isArray(termsData)) {
    throw new Error("Terms data must be an array");
  }

  for (const term of termsData) {
    if (!term || typeof term !== "object") {
      throw new Error("Each term must be an object");
    }
    if (!term.en || !term.en.trim()) {
      throw new Error("Each term must have a non-empty en property");
    }
  }
}

/**
 * 验证删除术语索引的输入参数
 * @param {Array<number>} termIds - term ID列表
 * @throws {Error} 当参数无效时抛出错误
 */
export function validateDeleteTermIndexInput(termIds) {
  if (!Array.isArray(termIds)) {
    throw new Error("Term IDs must be an array");
  }

  for (let i = 0; i < termIds.length; i++) {
    if (typeof termIds[i] !== "number" || termIds[i] <= 0) {
      throw new Error(`Term ID at index ${i} must be a positive number`);
    }
  }
}

/**
 * 验证删除术语的输入参数
 * @param {number} termId - term ID
 * @throws {Error} 当参数无效时抛出错误
 */
export function validateDeleteTermInput(termId) {
  if (typeof termId !== "number" || termId <= 0) {
    throw new Error("Term ID must be a positive number");
  }
}

/**
 * 验证重建索引响应数据
 * @param {Object} data - 响应数据
 * @throws {Error} 当数据格式无效时抛出错误
 */
export function validateRebuildResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Invalid response format from Rebuild Term-match Index API"
    );
  }

  if (!data.message || typeof data.message !== "string") {
    throw new Error("message field is missing or invalid");
  }

  if (!data.user_id || typeof data.user_id !== "number") {
    throw new Error("user_id field is missing or invalid");
  }

  if (!data.status || typeof data.status !== "string") {
    throw new Error("status field is missing or invalid");
  }
}
