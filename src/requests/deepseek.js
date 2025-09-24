import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import { debugLog } from "../utils/debug.js";

export async function translateWithDeepSeek(
  content,
  onStatusUpdate = null,
  matchedTerms = null
) {
  const apiKey = localStorage.getItem("deepseek_api_key");
  const translationPromptEnabled = localStorage.getItem(
    "translation_prompt_enabled"
  );
  let prompt = localStorage.getItem("deepseek_prompt");

  // 检查翻译提示开关状态
  if (
    translationPromptEnabled === "true" ||
    translationPromptEnabled === true
  ) {
    // 如果开关开启，使用自定义prompt，如果没有自定义prompt则使用默认prompt
    if (!prompt) {
      prompt = DEFAULT_TRANSLATION_PROMPT;
    }
  } else {
    // 如果开关关闭，强制使用默认prompt
    prompt = DEFAULT_TRANSLATION_PROMPT;
  }

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
      terminologySection += `  <term>\n    <source>${term.en}</source>\n    <zh>${term.cn}</zh>\n    <ja>${term.jp}</ja>\n  </term>\n`;
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

  // 构建完整的请求体
  const requestBody = {
    model: "deepseek-chat",
    messages: messages,
    temperature: 0.1,
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
