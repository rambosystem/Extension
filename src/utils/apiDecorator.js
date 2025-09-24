/**
 * 更简洁的 API Loading 管理方案
 * 使用工厂函数创建带 loading 管理的 API 方法
 */

/**
 * 创建带 loading 管理的 API 方法
 * @param {string} loadingType - loading 类型
 * @param {Function} apiRequest - 原始 API 请求函数
 * @param {string} errorMessage - 错误消息
 * @returns {Function} API 方法函数
 */
export function createApiMethod(
  loadingType,
  apiRequest,
  errorMessage = "Operation failed"
) {
  return async function (...args) {
    // 设置 loading 状态
    if (this.setLoading) {
      this.setLoading(loadingType, true);
    }

    // 清除错误状态
    if (this.setError) {
      this.setError(null);
    }

    try {
      const result = await apiRequest.apply(this, args);
      return result;
    } catch (error) {
      console.error(`${errorMessage}:`, error);

      // 设置错误状态
      if (this.setError) {
        this.setError(errorMessage);
      }

      throw error;
    } finally {
      // 清除 loading 状态
      if (this.setLoading) {
        this.setLoading(loadingType, false);
      }
    }
  };
}

/**
 * 使用示例：
 *
 * // 在 store 中使用
 * import { createApiMethod } from "../utils/apiDecorator.js";
 * import { fetchUserData, updateUserData } from "../requests/user.js";
 *
 * export const useUserStore = defineStore("user", {
 *   state: () => ({
 *     userData: null,
 *     loading: { fetch: false, update: false },
 *     error: null
 *   }),
 *
 *   actions: {
 *     // 使用 createApiMethod 创建 API 方法
 *     fetchUser: createApiMethod("fetch", fetchUserData, "Failed to fetch user"),
 *     updateUser: createApiMethod("update", updateUserData, "Failed to update user"),
 *
 *     // 业务逻辑变得非常简洁
 *     async loadUserData() {
 *       const userData = await this.fetchUser();
 *       this.userData = userData;
 *     },
 *
 *     async saveUserData(userData) {
 *       await this.updateUser(userData);
 *       ElMessage.success("User updated successfully");
 *     }
 *   }
 * });
 */
