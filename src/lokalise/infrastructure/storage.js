// storage.js - 本地存储与 Chrome 扩展存储封装

/**
 * 获取当前环境的 window.localStorage（仅浏览器环境可用）
 * @returns {Storage|null} localStorage 或 null
 */
function getWindowLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

/** Pinia 持久化用的 localStorage 适配器 */
export const piniaLocalStorage = {
  getItem(key) {
    const storage = getWindowLocalStorage();
    return storage ? storage.getItem(key) : null;
  },
  setItem(key, value) {
    const storage = getWindowLocalStorage();
    if (storage) storage.setItem(key, value);
  },
  removeItem(key) {
    const storage = getWindowLocalStorage();
    if (storage) storage.removeItem(key);
  },
};

/**
 * 从 localStorage 读取项
 * @param {string} key - 存储键
 * @param {*} fallback - 读取失败或为空时的默认值
 * @returns {*} 解析后的值或 fallback
 */
export function getLocalItem(key, fallback = null) {
  try {
    const value = piniaLocalStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    console.error(`[storage] Failed to read localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * 写入 localStorage（对象会 JSON 序列化）
 * @param {string} key - 存储键
 * @param {*} value - 要存储的值
 * @returns {boolean} 是否写入成功
 */
export function setLocalItem(key, value) {
  try {
    const serialized =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    piniaLocalStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to write localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * 从 localStorage 删除项
 * @param {string} key - 存储键
 * @returns {boolean} 是否删除成功
 */
export function removeLocalItem(key) {
  try {
    piniaLocalStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to remove localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * 获取 Chrome 扩展的 storage.local 接口（仅扩展环境可用）
 * @returns {chrome.storage.StorageArea|null}
 */
function getChromeStorageLocal() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }
  return chrome.storage.local;
}

/**
 * 批量写入 Chrome storage.local
 * @param {Object} items - 键值对
 * @returns {Promise<void>}
 */
export function setChromeLocal(items) {
  const storage = getChromeStorageLocal();
  if (!storage) return Promise.resolve();
  return new Promise((resolve) => storage.set(items, resolve));
}

/**
 * 从 Chrome storage.local 读取指定键
 * @param {string|string[]|null} keys - 键或键数组，null 表示全部
 * @returns {Promise<Object>}
 */
export function getChromeLocal(keys) {
  const storage = getChromeStorageLocal();
  if (!storage) return Promise.resolve({});
  return new Promise((resolve) => storage.get(keys, resolve));
}

/**
 * 从 Chrome storage.local 删除指定键
 * @param {string|string[]} keys - 键或键数组
 * @returns {Promise<void>}
 */
export function removeChromeLocal(keys) {
  const storage = getChromeStorageLocal();
  if (!storage) return Promise.resolve();
  return new Promise((resolve) => storage.remove(keys, resolve));
}
