import { STORAGE_KEYS } from "../config/storageKeys.js";
import { getLocalItem, setLocalItem } from "../infrastructure/storage.js";

export function loadTranslationSettings() {
  return {
    autoDeduplication:
      getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED) === "true",
    wordSelectionTranslate:
      getLocalItem(STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED) === "true",
    deduplicateProject:
      getLocalItem(STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION, "Common") ||
      "Common",
    adTerms: getLocalItem(STORAGE_KEYS.AD_TERMS_STATUS) === "true",
    debugLogging: getLocalItem(STORAGE_KEYS.DEBUG_LOGGING_ENABLED) === "true",
  };
}

export function saveAutoDeduplication(enabled) {
  setLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED, enabled);
}

export function saveWordSelectionTranslate(enabled) {
  setLocalItem(STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED, enabled);
}

export function saveDeduplicateProject(projectName) {
  setLocalItem(STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION, projectName);
}

export function saveDebugLogging(enabled) {
  setLocalItem(STORAGE_KEYS.DEBUG_LOGGING_ENABLED, enabled);
}

export function saveTranslationSettingsDefaults() {
  saveAutoDeduplication(false);
  saveWordSelectionTranslate(false);
  saveDeduplicateProject("Common");
}
