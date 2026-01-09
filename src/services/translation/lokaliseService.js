/**
 * Lokalise Translation Service
 * 主服务函数：负责翻译、项目管理、上传等业务逻辑
 */

import { translateWithDeepSeek } from "./deepseekService.js";
import {
  fetchUserProjects,
  validateApiToken,
  uploadKeys,
} from "../../api/lokalise.js";
import { performTermMatching } from "./termMatcher.js";
import {
  buildUploadRequestBody,
  validateUploadParams,
  handleUploadErrors,
  createTranslationKey,
} from "./uploadHelper.js";

/**
 * 翻译内容（包含术语匹配逻辑）
 * @param {string} content - 要翻译的内容
 * @param {Function} onStatusUpdate - 状态更新回调（可选）
 * @param {Function} onChunk - 流式处理时的 chunk 回调（可选）
 * @returns {Promise<string>} 翻译结果
 */
export async function translate(
  content,
  onStatusUpdate = null,
  onChunk = null
) {
  const adTermsEnabled = localStorage.getItem("ad_terms_status");

  // 如果 ad_terms_status 不存在，默认关闭术语匹配
  const isAdTermsEnabled =
    adTermsEnabled === null
      ? false
      : adTermsEnabled === "true" || adTermsEnabled === true;

  let matchedTerms = null;

  // 检查 adTerms 开关状态，如果开启则进行术语匹配
  if (isAdTermsEnabled) {
    try {
      matchedTerms = await performTermMatching(content, onStatusUpdate);
    } catch (error) {
      // 术语匹配失败，继续翻译但不使用术语
      if (onStatusUpdate) {
        onStatusUpdate("translating");
      }
    }
  } else {
    // 直接开始翻译
    if (onStatusUpdate) {
      onStatusUpdate("translating");
    }
  }

  // 调用 DeepSeek 翻译服务
  return await translateWithDeepSeek(
    content,
    onStatusUpdate,
    matchedTerms,
    onChunk
  );
}

/**
 * 获取用户项目列表
 * @returns {Promise<Array>} 项目列表数组
 * @throws {Error} 当API调用失败或数据格式错误时抛出错误
 */
export async function getUserProjects() {
  try {
    const apiToken = localStorage.getItem("lokalise_api_token");

    if (!apiToken) {
      throw new Error(
        "Lokalise API token not found. Please configure your API token first."
      );
    }

    const response = await fetchUserProjects(apiToken);
    const responseData = await response.json();

    if (!responseData.projects || !Array.isArray(responseData.projects)) {
      throw new Error("Invalid response format: projects array not found");
    }

    // 数据转换：过滤和格式化项目列表
    const projectList = responseData.projects
      .filter((project) => project && project.project_id && project.name)
      .map((project) => ({
        project_id: project.project_id,
        name: project.name.trim(),
      }));

    return projectList;
  } catch (error) {
    console.error("Error fetching user projects:", error);
    throw error;
  }
}

/**
 * 上传翻译键值到Lokalise项目
 * @param {string} projectId - 项目ID
 * @param {Array} keys - 要上传的键值数组
 * @param {Array} tags - 可选的标签数组
 * @param {string} apiToken - 可选的 API Token（如果不提供则从 localStorage 读取）
 * @returns {Promise<Object>} 上传结果
 * @throws {Error} 当API调用失败或数据格式错误时抛出错误
 */
export async function uploadTranslationKeys(
  projectId,
  keys,
  tags = [],
  apiToken = null
) {
  try {
    // 检查API token是否配置
    const token = apiToken || localStorage.getItem("lokalise_api_token");
    if (!token) {
      throw new Error(
        "Lokalise API token not found. Please configure your API token first."
      );
    }

    // 验证 token 是否有效
    try {
      await validateApiToken(token);
    } catch (validationError) {
      if (validationError.message.includes("Invalid API token")) {
        throw validationError;
      }
      throw new Error(
        "Failed to validate API token. Please check your network connection."
      );
    }

    // 验证参数
    validateUploadParams(projectId, keys);

    // 构建请求体
    const requestBody = buildUploadRequestBody(keys, tags);

    // 调用 API
    const response = await uploadKeys(token, projectId, requestBody);
    const responseData = await response.json();

    // 处理响应中的错误
    handleUploadErrors(responseData);

    return responseData;
  } catch (error) {
    console.error("Error uploading translation keys:", error);
    throw error;
  }
}

// 导出辅助函数
export { createTranslationKey } from "./uploadHelper.js";
