import { generateTranslationPrompt } from "../config/prompts.js";
import { debugLog } from "../utils/debug.js";

export async function translateWithDeepSeek(
  content,
  onStatusUpdate = null,
  matchedTerms = null
) {
  const apiKey = localStorage.getItem("deepseek_api_key");

  // 获取目标语言设置
  const targetLanguages = JSON.parse(
    localStorage.getItem("target_languages") || "[]"
  );

  // 根据目标语言生成 Prompt
  const prompt = generateTranslationPrompt(targetLanguages);

  // 术语信息现在插入到用户输入中，而不是系统提示中

  // 构建结构化的输入内容
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

  let structuredInput = `<input>
  <copies>
${copiesSection}  </copies>
</input>`;

  // 如果有匹配的术语，将术语插入到输入之前
  if (matchedTerms && matchedTerms.length > 0) {
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

    // 将术语信息添加到输入内容之前
    structuredInput = terminologySection + structuredInput;
  }

  // 构建消息数组
  const messages = [
    {
      role: "system",
      content: prompt,
    },
    {
      role: "user",
      content: structuredInput,
    },
  ];

  // 获取翻译温度设置
  const translationTemperature = localStorage.getItem(
    "translation_temperature"
  );
  const temperature = translationTemperature
    ? parseFloat(translationTemperature)
    : 0.1;

  // 构建完整的请求体
  const requestBody = {
    model: "deepseek-chat",
    messages: messages,
    temperature: temperature,
    response_format: { type: "text" },
  };

  // 输出完整的DeepSeek请求信息
  debugLog("DeepSeek request body:", JSON.stringify(requestBody, null, 2));

  // 调用deepseek的api
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}. ${
        errorData.error?.message || ""
      }`
    );
  }

  const data = await response.json();
  debugLog("DeepSeek response:", JSON.stringify(data, null, 2));
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response format from API");
  }

  return data.choices[0].message.content;
}
