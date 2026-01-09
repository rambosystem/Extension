/**
 * 全局 i18n 工具
 * 提供全局的 t 函数，可以在任何地方直接使用，无需导入 useI18n
 * 
 * 使用方式：
 * import { t } from '../utils/i18n.js';
 * 
 * 或者：
 * import i18n from '../utils/i18n.js';
 * i18n.t('common.save')
 */
import { i18n } from '../composables/Core/useI18n.js';

// 导出全局 i18n 实例
export default i18n;

// 导出常用的 t 函数，方便使用
export const { t } = i18n;

// 导出其他常用的方法和属性
export const { 
  currentLanguage, 
  currentMessages,
  setLanguage,
  getSupportedLanguages,
  getCurrentLanguageName,
  isLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE
} = i18n;
