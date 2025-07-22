/**
 * 判断URL是否为合法的Lokalise上传地址
 * @param {string} url - 待验证的URL
 * @returns {boolean} - 验证结果
 */
export function isValidLokaliseUploadUrl(url) {
  if (!url?.trim()) {
    return false;
  }

  try {
    const parsedUrl = new URL(url.trim());
    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "app.lokalise.com" &&
      /^\/upload\/.+/.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}

export function isValidURL(url) {
  return isValidLokaliseUploadUrl(url);
}
