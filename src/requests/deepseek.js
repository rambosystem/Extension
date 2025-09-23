import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";

export async function translateWithDeepSeek(content, onStatusUpdate = null) {
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

  // 构建消息数组
  const messages = [
    {
      role: "system",
      content: prompt,
    },
    {
      role: "user",
      content: content,
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

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response format from API");
  }

  return data.choices[0].message.content;
}
