/**
 * CDN数据获取相关API
 */

// CDN地址配置
const CDN_URLS = {
  AmazonSearch:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/AmazonSearch/en.js",
  Common:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/Common/en.js",
  Commerce:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/Commerce/en.js",
};

/**
 * 从CDN获取翻译数据
 * @param {string} project - 项目名称 (AmazonSearch, Common 或 Commerce)
 * @returns {Promise<Object>} 解析后的翻译数据
 */
export async function fetchCdnTranslations(project) {
  const url = CDN_URLS[project];
  if (!url) {
    throw new Error(`Unknown project: ${project}`);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/javascript, text/javascript, */*",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsContent = await response.text();
    return parseTranslationData(jsContent);
  } catch (error) {
    console.error(`Failed to fetch CDN data for ${project}:`, error);
    throw new Error(`Failed to fetch translations from CDN: ${error.message}`);
  }
}

/**
 * 解析JavaScript格式的翻译数据
 * @param {string} jsContent - JavaScript内容
 * @returns {Object} 解析后的翻译数据
 */
function parseTranslationData(jsContent) {
  try {
    // 查找 var translations = { ... } 的模式
    const match = jsContent.match(/var\s+translations\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
      throw new Error("Could not find translations object in CDN data");
    }

    // 提取JavaScript对象字符串
    const objectString = match[1];

    // 使用更简单的方法：逐行解析键值对
    const translations = {};
    const lines = objectString.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (
        !trimmedLine ||
        trimmedLine.startsWith("//") ||
        trimmedLine.startsWith("/*")
      ) {
        continue;
      }

      // 匹配键值对模式: "key": "value" 或 key: "value"
      // 使用更复杂的正则表达式来处理包含引号和空格的键名
      const keyValueMatch = trimmedLine.match(
        /^["']([^"']+)["']\s*:\s*["']([^"']*(?:\\.[^"']*)*)["']\s*,?\s*$/
      );
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        let value = keyValueMatch[2];

        // 处理转义字符
        value = value
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, "\\");

        translations[key] = value;
      }
    }

    if (Object.keys(translations).length === 0) {
      throw new Error("No valid translations found in CDN data");
    }

    return translations;
  } catch (error) {
    console.error("Failed to parse translation data:", error);
    throw new Error(`Failed to parse translation data: ${error.message}`);
  }
}

/**
 * 将JavaScript对象格式转换为JSON格式
 * @param {string} jsObjectString - JavaScript对象字符串
 * @returns {string} JSON格式字符串
 */
function convertJsObjectToJson(jsObjectString) {
  let jsonString = jsObjectString;

  // 移除注释
  jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, "");
  jsonString = jsonString.replace(/\/\/.*$/gm, "");

  // 处理JavaScript对象键名（不需要引号的键名）
  // 匹配模式：单词字符后跟冒号，但不在引号内
  jsonString = jsonString.replace(/(\w+):/g, '"$1":');

  // 处理已经带引号的键名（避免重复引号）
  jsonString = jsonString.replace(/"(\w+)":/g, '"$1":');

  // 处理单引号字符串，转换为双引号
  // 使用更复杂的正则表达式来处理嵌套引号和转义字符
  jsonString = jsonString.replace(
    /'([^'\\]*(\\.[^'\\]*)*)'/g,
    (match, content) => {
      // 转义内容中的双引号和反斜杠
      const escapedContent = content
        .replace(/\\/g, "\\\\") // 转义反斜杠
        .replace(/"/g, '\\"'); // 转义双引号
      return `"${escapedContent}"`;
    }
  );

  // 处理尾随逗号
  jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

  // 处理undefined值
  jsonString = jsonString.replace(/:\s*undefined/g, ": null");

  // 处理JavaScript的true/false/null（确保它们是有效的JSON）
  jsonString = jsonString.replace(/:\s*true\b/g, ": true");
  jsonString = jsonString.replace(/:\s*false\b/g, ": false");
  jsonString = jsonString.replace(/:\s*null\b/g, ": null");

  return jsonString;
}

/**
 * 提取所有英文翻译文本
 * @param {Object} translations - 翻译数据对象
 * @returns {Set<string>} 英文文本集合
 */
export function extractEnglishTexts(translations) {
  const englishTexts = new Set();

  for (const [key, value] of Object.entries(translations)) {
    if (typeof value === "string" && value.trim()) {
      // 添加原始值
      englishTexts.add(value.trim());

      // 添加标准化后的值（去除多余空格、统一标点符号）
      const normalized = normalizeText(value.trim());
      if (normalized !== value.trim()) {
        englishTexts.add(normalized);
      }
    }
  }

  return englishTexts;
}

/**
 * 标准化文本（用于匹配）
 * @param {string} text - 原始文本
 * @returns {string} 标准化后的文本
 */
function normalizeText(text) {
  return text
    .replace(/\s+/g, " ") // 将多个空格替换为单个空格
    .replace(/[，,]/g, ",") // 统一逗号
    .replace(/[。.]/g, ".") // 统一句号
    .replace(/[！!]/g, "!") // 统一感叹号
    .replace(/[？?]/g, "?") // 统一问号
    .replace(/["""]/g, '"') // 统一引号
    .replace(/[''']/g, "'") // 统一单引号
    .trim();
}

/**
 * 检查文本是否存在于CDN数据中
 * @param {string} text - 待检查的文本
 * @param {Set<string>} cdnTexts - CDN中的文本集合
 * @returns {boolean} 是否存在
 */
export function isTextInCdn(text, cdnTexts) {
  if (!text || !text.trim()) {
    return false;
  }

  const trimmedText = text.trim();
  const normalizedText = normalizeText(trimmedText);

  return cdnTexts.has(trimmedText) || cdnTexts.has(normalizedText);
}
