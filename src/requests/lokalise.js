import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import { fetchCurrentUserTerms } from "./terms.js";
import { matchTerms } from "./termMatch.js";

export async function translate(content, onStatusUpdate = null) {
  const apiKey = localStorage.getItem("deepseek_api_key");
  const translationPromptEnabled = localStorage.getItem("translation_prompt_enabled");
  const adTermsEnabled = localStorage.getItem("ad_terms_status");
  let prompt = localStorage.getItem("deepseek_prompt");

  // 如果 ad_terms_status 不存在，默认开启术语匹配
  const isAdTermsEnabled = adTermsEnabled === null ? true : (adTermsEnabled === "true" || adTermsEnabled === true);

  // 检查翻译提示开关状态
  if (translationPromptEnabled === "true" || translationPromptEnabled === true) {
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
      content: `需要翻译的文本如下,每一行分别代表需要翻译的文案：\n${content}`,
    }
  ];

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
          const stored = localStorage.getItem('termMatch_similarity_threshold');
          const value = stored ? parseFloat(stored) : 0.7;
          return isNaN(value) ? 0.7 : Math.max(0.5, Math.min(1.0, value));
        } catch (error) {
          return 0.7;
        }
      };

      const getStoredTopK = () => {
        try {
          const stored = localStorage.getItem('termMatch_top_k');
          const value = stored ? parseInt(stored) : 10;
          return isNaN(value) ? 10 : Math.max(1, Math.min(50, value));
        } catch (error) {
          return 10;
        }
      };

      const getStoredMaxNGram = () => {
        try {
          const stored = localStorage.getItem('termMatch_max_ngram');
          const value = stored ? parseInt(stored) : 3;
          return isNaN(value) ? 3 : Math.max(1, Math.min(5, value));
        } catch (error) {
          return 3;
        }
      };

      // 解析内容为文本数组
      const textLines = content.trim().split('\n').filter(line => line.trim());
      
      // 执行术语匹配
      const matchOptions = {
        similarity_threshold: getStoredSimilarityThreshold(),
        top_k: getStoredTopK(),
        max_ngram: getStoredMaxNGram(),
        user_id: 1
      };

      let matchedTerms;
      try {
        matchedTerms = await matchTerms(textLines, matchOptions);
        // console.log("Matched terms:", matchedTerms);
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

      // 如果有匹配成功的术语，添加到消息中
      if (matchedTerms && matchedTerms.length > 0) {
        // console.log("Adding matched terms to messages, count:", matchedTerms.length);
        
        // 构建术语库文本
        let termsText = '这里提供可供参考的术语库，如果匹配到术语请根据术语库翻译文本：\n';
        matchedTerms.forEach(term => {
          termsText += `- ${term.en} -> ${term.cn} (${term.jp})\n`;
        });
        
        messages.push({
          role: "system",
          content: termsText,
        });
      } else {
        // console.log("No matched terms found");
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

  // 在控制台输出完整的消息数组（在术语匹配完成后）
  console.log("DeepSeek Messages:", JSON.stringify(messages, null, 2));

  //调用deepseek的api
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: messages,
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
