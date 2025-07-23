import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";

export async function translate(content) {
  const apiKey = localStorage.getItem("deepseek_api_key");
  const translationPromptEnabled = localStorage.getItem("translation_prompt_enabled");
  let prompt = localStorage.getItem("deepseek_prompt"); 

  // 检查翻译提示开关状态
  if (translationPromptEnabled === "true" || translationPromptEnabled === true) {
    // 如果开关开启，使用自定义prompt，如果没有自定义prompt则使用默认prompt
    if (!prompt) {
      prompt = DEFAULT_TRANSLATION_PROMPT;
      console.log(
        "Translation prompt enabled but no custom prompt found. Using default translation prompt."
      );
    } else {
      console.log("Using custom translation prompt.");
    }
  } else {
    // 如果开关关闭，强制使用默认prompt
    prompt = DEFAULT_TRANSLATION_PROMPT;
    console.log("Translation prompt disabled. Using default translation prompt.");
  }

  //调用deepseek的api
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `需要翻译的文本如下,每一行分别代表需要翻译的文案：
${content}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "text" },
    }),
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
