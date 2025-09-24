/**
 * 简单的调试日志控制工具
 * 根据设置中的调试日志开关控制 console.log 是否输出
 */

import { useTranslationSettingsStore } from "../stores/settings/translation.js";

let settingsStore = null;

/**
 * 初始化设置 Store
 */
function initStore() {
  if (!settingsStore) {
    try {
      settingsStore = useTranslationSettingsStore();
    } catch (error) {
      // Store 可能还未初始化，返回 false
      return false;
    }
  }
  return true;
}

/**
 * 检查是否启用调试日志
 * @returns {boolean} 是否启用调试日志
 */
function isDebugEnabled() {
  if (!initStore()) {
    return false;
  }
  return settingsStore.debugLogging || false;
}

/**
 * 受控的 console.log
 * 只有在调试日志开关开启时才会输出
 * @param {...any} args - console.log 的参数
 */
function debugLog(...args) {
  if (isDebugEnabled()) {
    console.log(...args);
  }
}

/**
 * 受控的 console.info
 * @param {...any} args - console.info 的参数
 */
function debugInfo(...args) {
  if (isDebugEnabled()) {
    console.info(...args);
  }
}

/**
 * 受控的 console.warn
 * @param {...any} args - console.warn 的参数
 */
function debugWarn(...args) {
  if (isDebugEnabled()) {
    console.warn(...args);
  }
}

/**
 * 受控的 console.error
 * @param {...any} args - console.error 的参数
 */
function debugError(...args) {
  if (isDebugEnabled()) {
    console.error(...args);
  }
}

// 导出调试工具
export { debugLog, debugInfo, debugWarn, debugError, isDebugEnabled };
