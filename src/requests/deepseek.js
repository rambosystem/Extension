import { generateTranslationPrompt } from "../config/prompts.js";
import { debugLog } from "../utils/debug.js";

export async function translateWithDeepSeek(
  content,
  onStatusUpdate = null,
  matchedTerms = null,
  onChunk = null
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

  // 获取最大输出token数设置（默认8192，支持最大输出）
  const maxTokensSetting = localStorage.getItem("translation_max_tokens");
  const maxTokens = maxTokensSetting ? parseInt(maxTokensSetting, 10) : 8192; // 默认8K，避免4K默认限制导致截断

  // 检查是否启用流式处理（默认启用）
  const streamEnabled = localStorage.getItem("stream_translation") !== "false";

  // 构建完整的请求体
  const requestBody = {
    model: "deepseek-chat",
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens, // 设置最大输出token数
    response_format: { type: "text" },
    stream: streamEnabled && onChunk !== null, // 如果有 onChunk 回调且流式处理启用，则使用流式
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

  // 如果启用流式处理且有回调函数，处理流式响应
  if (requestBody.stream && onChunk) {
    let fullContent = "";
    let finishReason = null;
    let tokenUsage = null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;

              // 检查是否有finish_reason（表示流结束）
              if (json.choices?.[0]?.finish_reason) {
                finishReason = json.choices[0].finish_reason;
                tokenUsage = json.usage || null;
              }

              if (delta) {
                fullContent += delta;
                // 调用回调函数传递增量内容
                onChunk(delta, fullContent);
              }
            } catch (e) {
              // 忽略解析错误，继续处理下一行
              debugLog("Failed to parse SSE data:", e, line);
            }
          }
        }
      }

      debugLog("DeepSeek streaming response completed:", fullContent);
      debugLog("Finish reason:", finishReason);
      debugLog("Token usage:", tokenUsage);

      // 如果因为token限制而停止，在返回的内容中添加标记
      if (finishReason === "length") {
        debugLog("Warning: Translation stopped due to token limit");
        // 可以在这里添加一个标记，让调用方知道输出被截断了
        // 但为了不影响现有逻辑，暂时只记录日志
      }

      return fullContent;
    } finally {
      reader.releaseLock();
    }
  } else {
    // 非流式处理（原有逻辑）
    const data = await response.json();
    debugLog("DeepSeek response:", JSON.stringify(data, null, 2));
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from API");
    }

    return data.choices[0].message.content;
  }
}
