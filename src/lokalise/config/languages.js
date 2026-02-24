// languages.js - 存储目标语言配置

/**
 * 默认可用目标语言列表
 * 可以在这里配置可用的翻译目标语言
 */
export const AVAILABLE_TARGET_LANGUAGES = [
  { code: "Chinese", name: "Chinese", iso: "zh_CN" },
  { code: "Japanese", name: "Japanese", iso: "ja" },
  { code: "Spanish", name: "Spanish", iso: "es" },
];

/**
 * 获取所有可用语言
 * @returns {Array<Object>} 语言列表
 */
export function getAvailableLanguages() {
  return AVAILABLE_TARGET_LANGUAGES;
}

/**
 * 根据语言代码获取语言名称
 * @param {string} code - 语言代码
 * @returns {string} 语言名称
 */
export function getLanguageName(code) {
  const language = AVAILABLE_TARGET_LANGUAGES.find(
    (lang) => lang.code === code
  );
  return language ? language.name : code;
}

/**
 * 根据语言代码获取ISO代码
 * @param {string} code - 语言代码
 * @returns {string} ISO代码
 */
export function getLanguageIso(code) {
  const language = AVAILABLE_TARGET_LANGUAGES.find(
    (lang) => lang.code === code
  );
  return language ? language.iso : code.toLowerCase();
}

/**
 * 检查语言代码是否有效
 * @param {string} code - 语言代码
 * @returns {boolean} 是否有效
 */
export function isValidLanguageCode(code) {
  return AVAILABLE_TARGET_LANGUAGES.some((lang) => lang.code === code);
}
