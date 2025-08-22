import { fetchCurrentUserTerms } from "./terms.js";
import { matchTerms } from "./termMatch.js";
import { translateWithDeepSeek } from "./deepseek.js";

export async function translate(content, onStatusUpdate = null) {
  const adTermsEnabled = localStorage.getItem("ad_terms_status");

  // 如果 ad_terms_status 不存在，默认开启术语匹配
  const isAdTermsEnabled =
    adTermsEnabled === null
      ? true
      : adTermsEnabled === "true" || adTermsEnabled === true;

  // 检查 adTerms 开关状态，如果开启则进行术语匹配
  if (isAdTermsEnabled) {
    try {
      // 更新状态：匹配术语中
      if (onStatusUpdate) {
        onStatusUpdate("matching_terms");
      }

      // 获取用户配置的参数
      const getStoredSimilarityThreshold = () => {
        try {
          const stored = localStorage.getItem("termMatch_similarity_threshold");
          const value = stored ? parseFloat(stored) : 0.7;
          return isNaN(value) ? 0.7 : Math.max(0.5, Math.min(1.0, value));
        } catch (error) {
          return 0.7;
        }
      };

      const getStoredTopK = () => {
        try {
          const stored = localStorage.getItem("termMatch_top_k");
          const value = stored ? parseInt(stored) : 10;
          return isNaN(value) ? 10 : Math.max(1, Math.min(50, value));
        } catch (error) {
          return 10;
        }
      };

      const getStoredMaxNGram = () => {
        try {
          const stored = localStorage.getItem("termMatch_max_ngram");
          const value = stored ? parseInt(stored) : 3;
          return isNaN(value) ? 3 : Math.max(1, Math.min(5, value));
        } catch (error) {
          return 3;
        }
      };

      // 解析内容为文本数组
      const textLines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // 执行术语匹配
      const matchOptions = {
        similarity_threshold: getStoredSimilarityThreshold(),
        top_k: getStoredTopK(),
        max_ngram: getStoredMaxNGram(),
        user_id: 1,
      };

      let matchedTerms;
      try {
        console.log("Starting term matching...");
        matchedTerms = await matchTerms(textLines, matchOptions);
        console.log(
          "Term matching completed, found terms:",
          matchedTerms ? matchedTerms.length : 0
        );
      } catch (error) {
        console.error("Term matching error in lokalise.js:", error);
        // 如果术语匹配失败，继续翻译但不使用术语
        if (onStatusUpdate) {
          onStatusUpdate("translating");
        }
        matchedTerms = null;
      }

      // 更新状态：匹配成功，翻译中
      if (onStatusUpdate) {
        onStatusUpdate("translating");
      }

      // 如果有匹配成功的术语，需要将术语信息传递给 DeepSeek 服务
      if (matchedTerms && matchedTerms.length > 0) {
        console.log(
          "Adding matched terms to translation, count:",
          matchedTerms.length
        );

        // 构建术语库文本并添加到内容中
        let termsText =
          "这里提供可供参考的术语库，如果匹配到术语请根据术语库翻译文本：\n";
        matchedTerms.forEach((term) => {
          termsText += `- ${term.en} -> ${term.cn} (${term.jp})\n`;
        });

        // 将术语信息添加到翻译内容中
        content = termsText + "\n\n需要翻译的文本：\n" + content;
      } else {
        console.log("No matched terms found");
      }
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
  return await translateWithDeepSeek(content, onStatusUpdate);
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

    const response = await fetch("https://api.lokalise.com/api2/projects", {
      method: "GET",
      headers: {
        "X-Api-Token": apiToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch projects: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ""
        }`
      );
    }

    const responseData = await response.json();

    if (!responseData.projects || !Array.isArray(responseData.projects)) {
      throw new Error("Invalid response format: projects array not found");
    }

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
 * @returns {Promise<Object>} 上传结果
 * @throws {Error} 当API调用失败或数据格式错误时抛出错误
 */
export async function uploadTranslationKeys(projectId, keys, tags = []) {
  try {
    // 检查API token是否配置
    const apiToken = localStorage.getItem("lokalise_api_token");
    if (!apiToken) {
      throw new Error(
        "Lokalise API token not found. Please configure your API token first."
      );
    }

    // 验证项目ID
    if (!projectId || !projectId.trim()) {
      throw new Error("Project ID is required");
    }

    // 验证键值数组
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("Keys array is required and cannot be empty");
    }

    // 构建请求体
    const requestBody = {
      keys: keys.map((key) => {
        const keyData = {
          key_name: key.key_name,
          platforms: key.platforms || ["web", "other"],
          translations: key.translations || [],
        };

        // 只有当tags存在且不为空时才添加
        if (tags && tags.length > 0) {
          keyData.tags = tags;
        }

        return keyData;
      }),
    };

    console.log("Uploading translation keys to Lokalise:", requestBody);

    const response = await fetch(
      `https://api.lokalise.com/api2/projects/${projectId}/keys`,
      {
        method: "POST",
        headers: {
          "X-Api-Token": apiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to upload translation keys: ${response.status} ${
          response.statusText
        }. ${errorData.error?.message || ""}`
      );
    }

    const responseData = await response.json();

    // 检查是否有错误
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

    console.log("Successfully uploaded translation keys:", responseData);
    return responseData;
  } catch (error) {
    console.error("Error uploading translation keys:", error);
    throw error;
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
