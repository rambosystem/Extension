/**
 * CDN API Client
 * 纯 HTTP 通信层，只负责网络请求，不包含业务逻辑
 */

// CDN地址配置
export const CDN_URLS = {
  AmazonSearch:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/AmazonSearch/en.js",
  Common:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/Common/en.js",
  Commerce:
    "https://pacvue-public-doc.s3.us-west-2.amazonaws.com/lokalise/Commerce/en.js",
};

/**
 * HEAD 请求检查文件是否更新
 * @param {string} url - CDN URL
 * @param {string|null} etag - ETag值（可选）
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function checkCdnFileUpdate(url, etag = null) {
  const headers = {
    Accept: "application/javascript, text/javascript, */*",
  };

  if (etag) {
    headers["If-None-Match"] = etag;
  }

  return await fetch(url, {
    method: "HEAD",
    headers,
  });
}

/**
 * GET 请求获取CDN文件内容
 * @param {string} url - CDN URL
 * @param {string|null} etag - ETag值（可选，用于条件请求）
 * @returns {Promise<Response>} Fetch Response 对象
 */
export async function fetchCdnFile(url, etag = null) {
  const headers = {
    Accept: "application/javascript, text/javascript, */*",
  };

  if (etag) {
    headers["If-None-Match"] = etag;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok && response.status !== 304) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}
