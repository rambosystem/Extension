/**
 * Upload Helper
 * 负责上传相关的辅助函数：构建请求体、验证参数、处理错误等
 */

/**
 * 构建上传请求体
 * @param {Array} keys - 要上传的键值数组
 * @param {Array} tags - 可选的标签数组
 * @returns {Object} 请求体对象
 */
export function buildUploadRequestBody(keys, tags) {
  return {
    keys: keys.map((key) => {
      const keyData = {
        key_name: key.key_name,
        platforms: key.platforms || ["web", "other"],
        translations: key.translations || [],
      };

      // 如果 key 本身包含 tags，使用它；否则使用传入的 tags 参数
      if (key.tags && key.tags.length > 0) {
        keyData.tags = key.tags;
      } else if (tags && tags.length > 0) {
        keyData.tags = tags;
      }

      return keyData;
    }),
  };
}

/**
 * 验证上传参数
 * @param {string} projectId - 项目ID
 * @param {Array} keys - 键值数组
 * @throws {Error} 当参数无效时抛出错误
 */
export function validateUploadParams(projectId, keys) {
  // 验证项目ID
  if (!projectId || !projectId.trim()) {
    throw new Error("Project ID is required");
  }

  // 验证键值数组
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("Keys array is required and cannot be empty");
  }
}

/**
 * 处理上传响应中的错误
 * @param {Object} responseData - 响应数据
 * @throws {Error} 当响应包含错误时抛出错误
 */
export function handleUploadErrors(responseData) {
  if (responseData.errors && responseData.errors.length > 0) {
    const errorMessages = responseData.errors
      .map(
        (error) =>
          `${error.key_name?.web || error.key_name?.ios || "Unknown key"}: ${
            error.message
          }`
      )
      .join("; ");

    console.warn("Some keys failed to upload:", responseData.errors);
    throw new Error(`Upload completed with errors: ${errorMessages}`);
  }
}

/**
 * 创建翻译键值的辅助函数
 * @param {string} keyName - 键名
 * @param {Object} translations - 翻译对象 {en: "English", zh_CN: "中文", ja: "日本語"}
 * @param {Array} platforms - 平台数组，默认为 ["web", "other"]
 * @returns {Object} 格式化的键值对象
 */
export function createTranslationKey(
  keyName,
  translations,
  platforms = ["web", "other"]
) {
  const translationArray = [];

  // 添加英文翻译
  if (translations.en) {
    translationArray.push({
      language_iso: "en",
      translation: translations.en,
    });
  }

  // 添加中文翻译
  if (translations.zh_CN) {
    translationArray.push({
      language_iso: "zh_CN",
      translation: translations.zh_CN,
    });
  }

  // 添加日文翻译
  if (translations.ja) {
    translationArray.push({
      language_iso: "ja",
      translation: translations.ja,
    });
  }

  return {
    key_name: keyName,
    platforms: platforms,
    translations: translationArray,
  };
}
