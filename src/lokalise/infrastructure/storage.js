/**
 * storage.js - 存储适配层（localStorage / chrome.storage / Pinia）
 * 统一封装本地存储与 Chrome 扩展 storage.local，并提供 Pinia 持久化插件所需的 storage 接口
 *
 * 双写策略：`piniaLocalStorage.setItem/removeItem` 会对白名单内的 key 异步镜像到
 * `chrome.storage.local`，供 content script / background service worker 读取。
 */

import { STORAGE_KEYS } from "@/lokalise/config/storageKeys.js";

/**
 * 需要在 localStorage 与 chrome.storage.local 之间双向同步的 key 集合
 * 这些 key 会被 content script / background / 扩展其它上下文读取
 */
export const CHROME_STORAGE_SYNC_KEYS = new Set([
  STORAGE_KEYS.DEEPSEEK_API_KEY,
  STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED,
  STORAGE_KEYS.CURRENT_MENU,
  STORAGE_KEYS.INITIAL_MENU,
  STORAGE_KEYS.LOKALISE_API_TOKEN,
]);

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

/** 把白名单 key 的变更异步镜像到 chrome.storage.local，错误静默 */
function mirrorSetToChromeStorage(key, value) {
  if (!CHROME_STORAGE_SYNC_KEYS.has(key)) return;
  const storage = getChromeStorageLocal();
  if (!storage) return;
  try {
    storage.set({ [key]: value }, () => {
      if (chrome?.runtime?.lastError) {
        console.error(
          `[storage] chrome.storage mirror set failed for "${key}":`,
          chrome.runtime.lastError.message,
        );
      }
    });
  } catch (error) {
    console.error(
      `[storage] chrome.storage mirror set threw for "${key}":`,
      error,
    );
  }
}

function mirrorRemoveFromChromeStorage(key) {
  if (!CHROME_STORAGE_SYNC_KEYS.has(key)) return;
  const storage = getChromeStorageLocal();
  if (!storage) return;
  try {
    storage.remove(key, () => {
      if (chrome?.runtime?.lastError) {
        console.error(
          `[storage] chrome.storage mirror remove failed for "${key}":`,
          chrome.runtime.lastError.message,
        );
      }
    });
  } catch (error) {
    console.error(
      `[storage] chrome.storage mirror remove threw for "${key}":`,
      error,
    );
  }
}

/** Pinia 持久化用的 localStorage 适配器（白名单 key 会自动双写到 chrome.storage.local） */
export const piniaLocalStorage = {
  getItem(key) {
    const storage = getWindowLocalStorage();
    return storage ? storage.getItem(key) : null;
  },
  setItem(key, value) {
    const storage = getWindowLocalStorage();
    if (storage) storage.setItem(key, value);
    mirrorSetToChromeStorage(key, value);
  },
  removeItem(key) {
    const storage = getWindowLocalStorage();
    if (storage) storage.removeItem(key);
    mirrorRemoveFromChromeStorage(key);
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

/**
 * App 启动时调用：把 chrome.storage.local 中白名单 key 的现值写回 localStorage，
 * 使 Pinia 的同步持久化拿到来自 background / 其它扩展上下文的最新状态。
 *
 * 注意：只覆盖 chrome.storage 里存在的 key；若只有 localStorage 有值，不会被清空。
 * @returns {Promise<void>}
 */
export async function hydrateFromChromeStorage() {
  const storage = getChromeStorageLocal();
  if (!storage) return;
  const localStorageRef = getWindowLocalStorage();
  if (!localStorageRef) return;
  const keys = Array.from(CHROME_STORAGE_SYNC_KEYS);
  try {
    const result = await new Promise((resolve) => storage.get(keys, resolve));
    for (const key of keys) {
      const value = result?.[key];
      if (value === undefined || value === null) continue;
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);
      localStorageRef.setItem(key, serialized);
    }
  } catch (error) {
    console.error("[storage] hydrateFromChromeStorage failed:", error);
  }
}
