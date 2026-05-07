import { i18n, useI18n } from "@/lokalise/composables/Core/useI18n.js";

export const t = i18n.t;
export const setLanguage = i18n.setLanguage;
export const getSupportedLanguages = i18n.getSupportedLanguages;
export const getCurrentLanguageName = i18n.getCurrentLanguageName;
export const isLanguage = i18n.isLanguage;
export const currentLanguage = i18n.currentLanguage;
export const currentMessages = i18n.currentMessages;
export const SUPPORTED_LANGUAGES = i18n.SUPPORTED_LANGUAGES;
export const DEFAULT_LANGUAGE = i18n.DEFAULT_LANGUAGE;

export { i18n, useI18n };
export default i18n;
