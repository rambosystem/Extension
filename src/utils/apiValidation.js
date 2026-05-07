/**
 * 验证DeepSeek API Key是否有效
 * @param {string} apiKey - 待验证的API Key
 * @returns {Promise<boolean>} - 验证结果
 */
export async function validateDeepSeekApiKey(apiKey) {
  if (!apiKey?.trim()) {
    throw new Error("API Key cannot be empty");
  }

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: "Hello, world!" }],
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("API Key validation failed:", error);
    return false;
  }
}
