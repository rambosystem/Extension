// storage.js - Chrome Extension Storage Utilities

/**
 * 设置存储项
 * @param {string} key
 * @param {any} value
 * @returns {Promise}
 */
export const setStorage = (key, value) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

/**
 * 获取存储项
 * @param {string} key
 * @returns {Promise}
 */
export const getStorage = (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
};

/**
 * 获取多个存储项
 * @param {string[]} keys
 * @returns {Promise}
 */
export const getMultipleStorage = (keys) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * 清空本地存储
 * @returns {Promise}
 */
export const clearStorage = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

/**
 * 删除指定存储项
 * @param {string|string[]} keys
 * @returns {Promise}
 */
export const removeStorage = (keys) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};
