import { ElMessage } from "element-plus";
import { t } from "../../../utils/i18n.js";
import { debugLog } from "../../../utils/debug.js";
import { useApiStore } from "../../stores/settings/api.js";
import { useTranslationSettingsStore } from "../../stores/settings/translation.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";
import { useTermsStore } from "../../stores/terms.js";
import { useAppStore } from "../../stores/app.js";
import { useExportStore } from "../../stores/translation/export.js";
import { useTranslationCache } from "../../composables/Translation/useTranslationCache.js";
import { STORAGE_KEYS } from "../../config/storageKeys.js";
import { getLocalItem } from "../../infrastructure/storage.js";

/**
 * 全局清除/重置：编排各 store 的 initializeToDefaults、缓存清理、对话框关闭与校验。
 * 职责归属：orchestrator（不再由 translation/settings store 承担）。
 */
export async function clearAllSettings() {
  const apiStore = useApiStore();
  const translationSettingsStore = useTranslationSettingsStore();
  const translationCoreStore = useTranslationCoreStore();
  const termsStore = useTermsStore();
  const appStore = useAppStore();
  const exportStore = useExportStore();
  const cache = useTranslationCache();

  try {
    translationSettingsStore.initializeToDefaults();
    apiStore.initializeToDefaults();
    translationCoreStore.initializeToDefaults();
    termsStore.initializeToDefaults();
    appStore.initializeToDefaults();
    exportStore.initializeToDefaults();
    cache.clearCache();
    translationSettingsStore.saveImportantSettings();

    termsStore.refreshTerms(false).catch((error) => {
      console.error("Terms refresh failed after cache clear:", error);
    });

    translationSettingsStore.dialogVisible = false;

    debugLog("Cache initialization completed. Settings reset to defaults:");
    debugLog(
      "- auto_deduplication_enabled:",
      getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED)
    );
    debugLog(
      "- deduplicate_project_selection:",
      getLocalItem(STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION)
    );
    debugLog("- ad_terms_status:", getLocalItem(STORAGE_KEYS.AD_TERMS_STATUS));
    debugLog(
      "- terms-store:",
      getLocalItem(STORAGE_KEYS.TERMS_STORE) ? "exists" : "not found"
    );
    debugLog(
      "- deepseek_api_key:",
      getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY) ? "exists" : "cleared"
    );
    debugLog(
      "- lokalise_api_token:",
      getLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN) ? "exists" : "cleared"
    );
    debugLog(
      "- default_project_id:",
      getLocalItem(STORAGE_KEYS.DEFAULT_PROJECT_ID) ? "exists" : "cleared"
    );
    debugLog("- API Store apiKey:", apiStore.apiKey || "empty");
    debugLog(
      "- API Store lokaliseApiToken:",
      apiStore.lokaliseApiToken || "empty"
    );
    debugLog(
      "- App Store defaultProjectId:",
      appStore.defaultProjectId || "empty"
    );

    ElMessage.success(t("messages.cacheInitializedSuccessfully"));

    await translationSettingsStore.autoValidateCache();
  } catch (error) {
    console.error("Failed to initialize cache:", error);
    ElMessage.error(t("messages.failedToInitializeCache"));
  }
}

export function clearTranslationSettingsWorkflow({
  initializeSettingsDefaults,
  saveImportantSettings,
  closeDialog,
  onAutoValidate,
  onDebugLog,
}) {
  const apiStore = useApiStore();
  const translationCoreStore = useTranslationCoreStore();
  const termsStore = useTermsStore();
  const appStore = useAppStore();
  const exportStore = useExportStore();
  const cache = useTranslationCache();

  initializeSettingsDefaults();
  apiStore.initializeToDefaults();
  translationCoreStore.initializeToDefaults();
  termsStore.initializeToDefaults();
  appStore.initializeToDefaults();
  exportStore.initializeToDefaults();
  cache.clearCache();
  saveImportantSettings();

  termsStore.refreshTerms(false).catch((error) => {
    console.error("Terms refresh failed after cache clear:", error);
  });

  closeDialog();

  if (onDebugLog) {
    onDebugLog("Cache initialization completed. Settings reset to defaults:");
    onDebugLog(
      "- auto_deduplication_enabled:",
      getLocalItem(STORAGE_KEYS.AUTO_DEDUPLICATION_ENABLED)
    );
    onDebugLog(
      "- deduplicate_project_selection:",
      getLocalItem(STORAGE_KEYS.DEDUPLICATE_PROJECT_SELECTION)
    );
    onDebugLog("- ad_terms_status:", getLocalItem(STORAGE_KEYS.AD_TERMS_STATUS));
    onDebugLog(
      "- terms-store:",
      getLocalItem(STORAGE_KEYS.TERMS_STORE) ? "exists" : "not found"
    );
    onDebugLog(
      "- deepseek_api_key:",
      getLocalItem(STORAGE_KEYS.DEEPSEEK_API_KEY) ? "exists" : "cleared"
    );
    onDebugLog(
      "- lokalise_api_token:",
      getLocalItem(STORAGE_KEYS.LOKALISE_API_TOKEN) ? "exists" : "cleared"
    );
    onDebugLog(
      "- lokalise_projects:",
      getLocalItem(STORAGE_KEYS.LOKALISE_PROJECTS) ? "exists" : "cleared"
    );
    onDebugLog(
      "- default_project_id:",
      getLocalItem(STORAGE_KEYS.DEFAULT_PROJECT_ID) ? "exists" : "cleared"
    );
    onDebugLog("- API Store apiKey:", apiStore.apiKey || "empty");
    onDebugLog(
      "- API Store lokaliseApiToken:",
      apiStore.lokaliseApiToken || "empty"
    );
    onDebugLog(
      "- App Store defaultProjectId:",
      appStore.defaultProjectId || "empty"
    );
  }

  if (onAutoValidate) {
    onAutoValidate();
  }
}
