/**
 * 缓存初始化校验 Composable
 * 使用 Vue 3 组合式 API 的校验逻辑
 */

import { ref } from "vue";
import { debugLog } from "../../utils/debug.js";
import { t } from "../../utils/i18n.js";

/**
 * 缓存校验 Composable
 */
export function useCacheValidation() {
  const isValidating = ref(false);
  const lastValidationResult = ref(null);

  /**
   * 校验缓存初始化结果
   * @param {Object} expectedSettings - 预期的设置状态
   * @returns {Promise<Object>} 校验结果
   */
  const validateCacheInitialization = async (expectedSettings = {}) => {
    isValidating.value = true;

    try {
      // 延迟执行，确保所有操作完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      const validationResults = {
        preserved: {},
        cleared: {},
        errors: [],
        timestamp: new Date().toISOString(),
      };

      // 校验应该被保留的设置
      const preservedSettings = {
        auto_deduplication_enabled: expectedSettings.autoDeduplication
          ? "true"
          : "false",
        deduplicate_project_selection:
          expectedSettings.deduplicateProject || "Common",
        ad_terms_status: expectedSettings.adTerms ? "true" : "false",
        debug_logging_enabled: expectedSettings.debugLogging ? "true" : "false",
        translation_prompt_enabled: expectedSettings.translationPrompt
          ? "true"
          : "false",
        custom_translation_prompt: expectedSettings.customPrompt || "",
        termMatch_similarity_threshold:
          expectedSettings.similarityThreshold?.toString() || "0.7",
        termMatch_top_k: expectedSettings.topK?.toString() || "10",
        termMatch_max_ngram: expectedSettings.maxNGram?.toString() || "3",
        translation_temperature:
          expectedSettings.translationTemperature?.toString() || "0.1",
        app_language: expectedSettings.appLanguage || "en",
      };

      for (const [key, expectedValue] of Object.entries(preservedSettings)) {
        const actualValue = localStorage.getItem(key);
        validationResults.preserved[key] = {
          expected: expectedValue,
          actual: actualValue,
          valid: actualValue === expectedValue,
        };

        if (actualValue !== expectedValue) {
          validationResults.errors.push(
            t("cacheValidation.settingMismatch", {
              key,
              expected: expectedValue,
              actual: actualValue,
            })
          );
        }
      }

      // 校验应该被清除的设置
      const clearedSettings = [
        "last_translation",
        "lokalise_upload_project_id",
        "lokalise_upload_tag",
        "excel_baseline_key",
        "excel_overwrite",
        "pending_translation_cache",
      ];

      for (const key of clearedSettings) {
        const value = localStorage.getItem(key);
        validationResults.cleared[key] = {
          cleared: value === null,
          value: value,
        };

        if (value !== null) {
          validationResults.errors.push(
            t("cacheValidation.settingNotCleared", {
              key,
              value,
            })
          );
        }
      }

      // 校验 terms-store 是否存在
      const termsStoreExists = localStorage.getItem("terms-store") !== null;
      validationResults.preserved["terms-store"] = {
        expected: "exists",
        actual: termsStoreExists ? "exists" : "not found",
        valid: termsStoreExists,
      };

      // 如果 terms-store 不存在，检查是否是因为从未初始化过
      if (!termsStoreExists) {
        // 检查是否有其他 terms 相关的数据
        const hasTermsData =
          localStorage.getItem("termsData") !== null ||
          localStorage.getItem("termsStatus") !== null ||
          localStorage.getItem("embeddingStatus") !== null;

        if (!hasTermsData) {
          // 如果没有任何 terms 相关数据，说明从未使用过 terms 功能
          debugLog(t("cacheValidation.termsStoreNeverInitialized"));
          validationResults.preserved["terms-store"].note = t(
            "cacheValidation.neverInitialized"
          );
          // 不将其视为错误
        } else {
          // 如果有其他 terms 数据但缺少 terms-store，则视为错误
          validationResults.errors.push(t("cacheValidation.termsStoreMissing"));
        }
      }

      // 输出校验结果
      debugLog(
        t("cacheValidation.preservedSettings") + ":",
        validationResults.preserved
      );
      debugLog(
        t("cacheValidation.clearedSettings") + ":",
        validationResults.cleared
      );

      const result = {
        ...validationResults,
        success: validationResults.errors.length === 0,
      };

      if (validationResults.errors.length > 0) {
        debugLog(
          t("cacheValidation.validationErrors") + ":",
          validationResults.errors
        );
      } else {
        debugLog(t("cacheValidation.validationPassed"));
      }

      lastValidationResult.value = result;
      return result;
    } catch (error) {
      console.error("Failed to validate cache initialization:", error);
      debugLog(t("cacheValidation.validationError") + " -", error.message);

      const errorResult = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      lastValidationResult.value = errorResult;
      return errorResult;
    } finally {
      isValidating.value = false;
    }
  };

  /**
   * 快速校验重要设置是否存在
   * @returns {boolean} 是否通过校验
   */
  const quickValidateImportantSettings = () => {
    const importantSettings = [
      "auto_deduplication_enabled",
      "deduplicate_project_selection",
      "ad_terms_status",
    ];

    for (const key of importantSettings) {
      if (localStorage.getItem(key) === null) {
        debugLog(t("cacheValidation.quickValidationFailed", { key }));
        return false;
      }
    }

    // 检查 terms-store，如果不存在但从未初始化过则不视为错误
    const termsStoreExists = localStorage.getItem("terms-store") !== null;
    if (!termsStoreExists) {
      const hasTermsData =
        localStorage.getItem("termsData") !== null ||
        localStorage.getItem("termsStatus") !== null ||
        localStorage.getItem("embeddingStatus") !== null;

      if (hasTermsData) {
        debugLog(t("cacheValidation.termsStoreMissingWithData"));
        return false;
      } else {
        debugLog(t("cacheValidation.termsStoreNeverInitialized"));
      }
    }

    debugLog(t("cacheValidation.quickValidationPassed"));
    return true;
  };

  /**
   * 重置校验状态
   */
  const resetValidation = () => {
    isValidating.value = false;
    lastValidationResult.value = null;
  };

  return {
    // 状态
    isValidating,
    lastValidationResult,

    // 方法
    validateCacheInitialization,
    quickValidateImportantSettings,
    resetValidation,
  };
}
