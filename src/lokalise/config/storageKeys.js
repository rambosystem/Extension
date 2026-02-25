/**
 * storageKeys.js - 统一存储键常量
 * 应用内 localStorage / chrome.storage 使用的键名集中定义，避免魔法字符串
 */

/** 应用内使用的存储键名（与 storage 适配层、各 store 一致） */
export const STORAGE_KEYS = {
  APP_LANGUAGE: "app_language",
  CURRENT_MENU: "currentMenu",
  INITIAL_MENU: "initialMenu",
  DEEPSEEK_API_KEY: "deepseek_api_key",
  LOKALISE_API_TOKEN: "lokalise_api_token",
  LOKALISE_PROJECTS: "lokalise_projects",
  DEFAULT_PROJECT_ID: "default_project_id",
  LOKALISE_UPLOAD_PROJECT_ID: "lokalise_upload_project_id",
  LOKALISE_UPLOAD_TAG: "lokalise_upload_tag",
  AUTO_DEDUPLICATION_ENABLED: "auto_deduplication_enabled",
  WORD_SELECTION_TRANSLATE_ENABLED: "word_selection_translate_enabled",
  DEDUPLICATE_PROJECT_SELECTION: "deduplicate_project_selection",
  AD_TERMS_STATUS: "ad_terms_status",
  DEBUG_LOGGING_ENABLED: "debug_logging_enabled",
  EXCEL_BASELINE_KEY: "excel_baseline_key",
  EXCEL_OVERWRITE: "excel_overwrite",
  AUTO_INCREMENT_KEY_ENABLED: "auto_increment_key_enabled",
  LAST_TRANSLATION: "last_translation",
  TARGET_LANGUAGES: "target_languages",
  AUTO_CONTINUE_ON_TRUNCATE: "auto_continue_on_truncate",
  TRANSLATION_MAX_TOKENS: "translation_max_tokens",
  STREAM_TRANSLATION: "stream_translation",
  TRANSLATION_PROMPT_ENABLED: "translation_prompt_enabled",
  CUSTOM_TRANSLATION_PROMPT: "custom_translation_prompt",
  TERM_MATCH_SIMILARITY_THRESHOLD: "termMatch_similarity_threshold",
  TERM_MATCH_TOP_K: "termMatch_top_k",
  TERM_MATCH_MAX_NGRAM: "termMatch_max_ngram",
  TRANSLATION_TEMPERATURE: "translation_temperature",
  PENDING_TRANSLATION_CACHE: "pending_translation_cache",
  TERMS_STORE: "terms-store",
  TERMS_DATA: "termsData",
  TERMS_STATUS: "termsStatus",
  EMBEDDING_STATUS: "embeddingStatus",
};
