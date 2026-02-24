/**
 * XML Builder
 * 负责构建结构化的 XML 输入内容
 */

/**
 * 转义 CDATA 内容
 * 防止用户内容中的 ]]> 破坏 XML 结构
 * @param {string} content - 需要转义的 CDATA 内容
 * @returns {string} 转义后的内容
 */
function escapeCdata(content) {
  // 把 "]]>" 替换为 "]]]]><![CDATA[>"，这是 XML 标准转义法
  return content.replace(/]]>/g, ']]]]><![CDATA[>');
}

/**
 * 转义 XML 标签内容
 * 防止用户内容中的特殊字符破坏 XML 结构
 * @param {string} unsafe - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 构建结构化的 XML 输入内容
 * @param {string} content - 原始文本内容
 * @returns {string} 结构化的 XML 输入
 */
export function buildStructuredInput(content) {
  // 将内容按行分割，每条文案一个独立的copy
  const textLines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  let copiesSection = "";
  textLines.forEach((line, index) => {
    copiesSection += `    <copy id="${index + 1}"><![CDATA[
${escapeCdata(line.trim())}
]]></copy>
`;
  });

  return `<input>
  <copies>
${copiesSection}  </copies>
</input>`;
}

/**
 * 构建术语 XML 部分
 * @param {Array} matchedTerms - 匹配的术语数组
 * @param {Array<string>} targetLanguages - 目标语言数组
 * @returns {string} 术语 XML 字符串
 */
export function buildTerminologySection(matchedTerms, targetLanguages) {
  if (!matchedTerms || matchedTerms.length === 0) {
    return "";
  }

  let terminologySection = `<terminology>\n`;
  matchedTerms.forEach((term) => {
    terminologySection += `  <term>\n    <source>${escapeXml(term.en)}</source>`;

    // 根据目标语言动态添加术语翻译
    if (
      targetLanguages.includes("Chinese") ||
      targetLanguages.includes("中文")
    ) {
      terminologySection += `\n    <zh>${escapeXml(term.cn || "")}</zh>`;
    }
    if (
      targetLanguages.includes("Japanese") ||
      targetLanguages.includes("日文")
    ) {
      terminologySection += `\n    <ja>${escapeXml(term.jp || "")}</ja>`;
    }

    // 支持其他自定义语言的术语
    targetLanguages.forEach((lang) => {
      if (
        lang !== "English" &&
        lang !== "Chinese" &&
        lang !== "Japanese" &&
        lang !== "中文" &&
        lang !== "日文"
      ) {
        // 尝试从术语对象中获取对应语言的翻译
        const langKey = lang.toLowerCase();
        if (term[langKey] || term[lang]) {
          const termValue = term[langKey] || term[lang];
          terminologySection += `\n    <${langKey}>${escapeXml(termValue)}</${langKey}>`;
        }
      }
    });

    terminologySection += `\n  </term>\n`;
  });
  terminologySection += `</terminology>\n\n`;

  return terminologySection;
}

/**
 * 构建完整的用户输入内容（包含术语和结构化输入）
 * @param {string} content - 原始文本内容
 * @param {Array} matchedTerms - 匹配的术语数组
 * @param {Array<string>} targetLanguages - 目标语言数组
 * @returns {string} 完整的用户输入内容
 */
export function buildUserContent(content, matchedTerms, targetLanguages) {
  let structuredInput = buildStructuredInput(content);

  // 如果有匹配的术语，将术语插入到输入之前
  if (matchedTerms && matchedTerms.length > 0) {
    const terminologySection = buildTerminologySection(
      matchedTerms,
      targetLanguages
    );
    structuredInput = terminologySection + structuredInput;
  }

  return structuredInput;
}
