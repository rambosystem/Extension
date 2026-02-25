import { STORAGE_KEYS } from "../config/storageKeys.js";
import { getLocalItem, setLocalItem } from "../infrastructure/storage.js";

export function saveLastTranslation(payload) {
  return setLocalItem(STORAGE_KEYS.LAST_TRANSLATION, payload);
}

export function loadLastTranslation() {
  const stored = getLocalItem(STORAGE_KEYS.LAST_TRANSLATION);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse stored last translation:", error);
    return null;
  }
}

export function getDeepSeekApiKey() {
  return getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY, "");
}

export function isAutoDeduplicationEnabled() {
  return getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED) === "true";
}

export function getAutoDeduplicationRawValue() {
  return getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED);
}

export function getTargetLanguages() {
  const raw = getLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, "[]");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse target languages from storage:", error);
    return [];
  }
}

export function shouldAutoContinueOnTruncate() {
  return getLocalItem(STORAGE_KEYS.AUTO_CONTINUE_ON_TRUNCATE) !== "false";
}
