/**
 * XML Builder
 * 负责构建结构化的 XML 输入内容
 */

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
${line.trim()}
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
    terminologySection += `  <term>\n    <source>${term.en}</source>`;

    // 根据目标语言动态添加术语翻译
    if (
      targetLanguages.includes("Chinese") ||
      targetLanguages.includes("中文")
    ) {
      terminologySection += `\n    <zh>${term.cn || ""}</zh>`;
    }
    if (
      targetLanguages.includes("Japanese") ||
      targetLanguages.includes("日文")
    ) {
      terminologySection += `\n    <ja>${term.jp || ""}</ja>`;
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
          terminologySection += `\n    <${langKey}>${
            term[langKey] || term[lang]
          }</${langKey}>`;
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
