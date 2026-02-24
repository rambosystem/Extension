import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { t } from "../../../utils/i18n.js";
import { useTranslation } from "../../composables/Translation/useTranslation.js";
import { useTranslationStorage } from "../../composables/Translation/useTranslationStorage.js";
import { useTranslationCache } from "../../composables/Translation/useTranslationCache.js";
import { debugLog } from "../../../utils/debug.js";
import { generateKeysForTranslationResult } from "../../../utils/keyGenerator.js";
import { useExportStore } from "./export.js";

/**
 * ???????????
 * ????????????????????
 */
export const useTranslationCoreStore = defineStore("translationCore", {
  state: () => ({
    // ????
    codeContent: "",

    // ????
    translationResult: [],

    // ??????????????????targetLanguages??
    translationTargetLanguages: [],

    // ??????
    dialogVisible: false,

    // ?????
    isTranslating: false,

    // ?????
    loadingStates: {
      translation: false,
    },

    // ????????
    translationProgress: {
      finished: 0,
      total: 0,
    },

    // ???????
    isTranslationTruncated: false,

    // ??????????????????
    originalCodeContent: "",

    // ??????????????????????
    accumulatedTranslationResult: [],

    // ??????????????????????
    currentBatchResult: [],

    // ????
    userSuggestion: "",
    userSuggestionVisible: false,

    // ????
    formRef: null,
    formData: {},

    // ????
    hasLastTranslation: false,
    lastTranslation: [],
  }),

  getters: {
    // ?????????
    hasTranslationResult: (state) => state.translationResult.length > 0,

    // ???????????
    hasContent: (state) => !!state.codeContent?.trim(),

    // ?????????
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // ????????
    translationCount: (state) => state.translationResult.length,
  },

  actions: {
    /**
     * ???????
     * @param {string} key - ?????
     * @param {boolean} loading - ?????
     */
    setLoading(key, loading) {
      if (this.loadingStates.hasOwnProperty(key)) {
        this.loadingStates[key] = loading;
      }
    },

    /**
     * ??????
     * @param {string} content - ????
     */
    setCodeContent(content) {
      this.codeContent = content || "";
    },

    /**
     * ??????
     */
    clearCodeContent() {
      this.codeContent = "";
    },

    /**
     * ??????
     * @param {Array} result - ??????
     */
    setTranslationResult(result) {
      this.translationResult = result || [];
    },

    /**
     * ??????
     * @param {Object} item - ????
     */
    addTranslationResult(item) {
      this.translationResult.push(item);
    },

    /**
     * ????????
     * @param {number} index - ??
     */
    removeTranslationResult(index) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult.splice(index, 1);
      }
    },

    /**
     * ????????
     * @param {number} index - ??
     * @param {Object} item - ????
     */
    updateTranslationResult(index, item) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index] = {
          ...this.translationResult[index],
          ...item,
        };
      }
    },

    /**
     * ??????
     */
    clearTranslationResult() {
      this.translationResult = [];
    },

    /**
     * ?????????
     * @param {boolean} visible - ????
     */
    setDialogVisible(visible) {
      this.dialogVisible = visible;
    },

    /**
     * ??????
     */
    openDialog() {
      this.dialogVisible = true;
    },

    /**
     * ??????
     */
    closeDialog() {
      this.dialogVisible = false;
    },

    /**
     * ???????????
     * @returns {string} ???????
     */
    getStatusText() {
      if (this.loadingStates.translation) {
        return "Translating...";
      }
      return "Loading...";
    },

    /**
     * ???????
     * @param {boolean} translating - ??????
     */
    setTranslating(translating) {
      this.isTranslating = translating;
    },

    /**
     * ?????
     * @param {number} totalCount - ?????????
     * @param {boolean} isResume - ????????????????
     */
    startTranslation(totalCount = 0, isResume = false) {
      // ?????????????????????????
      if (!isResume) {
        this.clearTranslationResult();
        this.accumulatedTranslationResult = [];
        this.currentBatchResult = [];
        // ????????
        this.originalCodeContent = this.codeContent;
      } else {
        // ??????????????
        this.currentBatchResult = [];
      }
      this.isTranslating = true;
      this.setLoading("translation", true);
      // ???????
      this.isTranslationTruncated = false;
      // ????????
      this.translationProgress = {
        finished: isResume ? this.accumulatedTranslationResult.length : 0,
        total: totalCount,
      };
    },

    /**
     * ????
     */
    finishTranslation() {
      this.isTranslating = false;
      this.setLoading("translation", false);
      // ??????????????????
      this.translationProgress = {
        finished: this.accumulatedTranslationResult.length || 0,
        total: 0,
      };
      // ???????????????????????
    },

    /**
     * ??????
     * @param {number} finished - ??????
     */
    updateTranslationProgress(finished) {
      if (this.translationProgress.total > 0) {
        this.translationProgress.finished = Math.min(
          finished,
          this.translationProgress.total
        );
      }
    },

    /**
     * ??????
     * @param {string} suggestion - ????
     */
    setUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
    },

    /**
     * ??????
     * @param {string} suggestion - ????
     */
    showUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
      this.userSuggestionVisible = true;
    },

    /**
     * ??????
     */
    hideUserSuggestion() {
      this.userSuggestion = "";
      this.userSuggestionVisible = false;
    },

    /**
     * ????????
     * @param {Array} translation - ????
     */
    setLastTranslation(translation) {
      this.lastTranslation = translation || [];
      this.hasLastTranslation = translation && translation.length > 0;
    },

    /**
     * ????????
     */
    clearLastTranslation() {
      this.lastTranslation = [];
      this.hasLastTranslation = false;
    },

    /**
     * ?????????????????
     * @param {Array} data - ???????????
     * @returns {Array} ??????
     */
    extractTranslationData(data) {
      if (!data || !Array.isArray(data)) {
        return [];
      }
      return data.map((item) => {
        const result = {};
        Object.keys(item).forEach((key) => {
          if (!key.startsWith("editing_")) {
            result[key] = item[key];
          }
        });
        return result;
      });
    },

    /**
     * ????????????
     * @param {Array} data - ??????????????
     */
    saveTranslationToLocal(data) {
      try {
        // ???????????????
        const translationData = this.extractTranslationData(data);

        // ??translationData ??targetLanguages ?????
        const dataToSave = {
          translationData,
          targetLanguages: this.translationTargetLanguages || [],
        };

        localStorage.setItem("last_translation", JSON.stringify(dataToSave));
        this.setLastTranslation(translationData);
      } catch (error) {
        console.error("Failed to save translation to local storage:", error);
      }
    },

    /**
     * ????????????
     */
    loadLastTranslation() {
      try {
        const stored = localStorage.getItem("last_translation");
        if (stored) {
          const parsed = JSON.parse(stored);
          this.setLastTranslation(parsed.translationData || []);
          this.translationTargetLanguages = parsed.targetLanguages || [];
        }
      } catch (error) {
        console.error("Failed to load last translation from storage:", error);
      }
    },

    /**
     * ??????????
     */
    async handleTranslate() {
      // ????????
      if (this.isTranslating) {
        return;
      }

      // ???API Key ????
      const apiKey = localStorage.getItem("deepseek_api_key");
      if (!apiKey) {
        ElMessage.warning(t("messages.pleaseConfigureAPIKeyFirst"));
        return;
      }

      // ???????????
      if (!this.codeContent?.trim()) {
        ElMessage.warning(t("messages.pleaseEnterContentToTranslate"));
        return;
      }

      // ???????????
      const autoDeduplicationEnabled =
        localStorage.getItem("auto_deduplication_enabled") === "true";

      // ??????????????
      debugLog("Translation deduplication check:");
      debugLog(
        "- auto_deduplication_enabled value:",
        localStorage.getItem("auto_deduplication_enabled")
      );
      debugLog("- autoDeduplicationEnabled:", autoDeduplicationEnabled);

      if (autoDeduplicationEnabled) {
        // ???????????????????
        debugLog(
          "Deduplication is enabled, returning needsDeduplication: true"
        );
        return { needsDeduplication: true };
      }

      // ??????
      debugLog("Deduplication is disabled, proceeding with normal translation");
      await this.continueTranslation();
      return { needsDeduplication: false };
    },

    /**
     * ????????
     * @param {Array} translatedResult - ????????
     * @returns {string} ????????????
     */
    extractRemainingContent(translatedResult) {
      if (!this.originalCodeContent) {
        return "";
      }

      // ??????????
      const originalLines = this.originalCodeContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // ????????????????en????
      const translatedLines = new Set();
      translatedResult.forEach((item) => {
        const enText = item.en || "";
        if (enText.trim()) {
          translatedLines.add(enText.trim());
        }
      });

      // ????????
      const remainingLines = originalLines.filter((line) => {
        const trimmedLine = line.trim();
        return trimmedLine && !translatedLines.has(trimmedLine);
      });

      return remainingLines.join("\n");
    },

    /**
     * ??????????????????
     * @param {boolean} isResume - ????????????????
     */
    async continueTranslation(isResume = false) {
      // ????????????
      const textLines = this.codeContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      const totalCount = textLines.length;

      // ???????????????????????
      const finalTotalCount = isResume
        ? this.originalCodeContent
            .trim()
            .split("\n")
            .filter((line) => line.trim()).length
        : totalCount;

      this.startTranslation(finalTotalCount, isResume);

      try {
        // ??????????????
        this.openDialog();

        // ?????? targetLanguages
        try {
          const targetLanguages = JSON.parse(
            localStorage.getItem("target_languages") || "[]"
          );
          this.translationTargetLanguages = targetLanguages;
        } catch (error) {
          console.warn("Failed to save target languages:", error);
          this.translationTargetLanguages = [];
        }

        // ??????????key
        const exportStore = useExportStore();
        const shouldAutoGenerateKey =
          exportStore.autoIncrementKeyEnabled &&
          exportStore.excelBaselineKey?.trim();

        // ?????????key????
        const startIndex = isResume
          ? this.accumulatedTranslationResult.length
          : 0;

        // ?????????????key??????
        // ??????????????????????key
        let preGeneratedKeys = [];
        if (shouldAutoGenerateKey) {
          // ?????????????key
          const emptyResults = Array(finalTotalCount)
            .fill(null)
            .map(() => ({}));
          preGeneratedKeys = generateKeysForTranslationResult(
            emptyResults,
            exportStore.excelBaselineKey,
            startIndex
          );
        }

        // ??????????
        const translation = useTranslation();

        // ????????
        // ??????????????????????key????
        const onProgress = (partialResult, fullText) => {
          if (partialResult && Array.isArray(partialResult)) {
            let resultToSet = partialResult;

            // ????????key??????????????key????
            if (shouldAutoGenerateKey) {
              // ???????????key??
              // ???partialResult ????????isResume ??
              resultToSet = partialResult.map((item, index) => {
                // ????????????????????????????
                const globalIndex = isResume ? startIndex + index : index;
                const preGeneratedKey = preGeneratedKeys[globalIndex];
                if (preGeneratedKey && preGeneratedKey.key) {
                  return {
                    ...item,
                    key: preGeneratedKey.key, // ???????key
                  };
                }
                return item;
              });
            }

            if (isResume) {
              // ????????????????????
              // partialResult ???????????????????
              this.currentBatchResult = resultToSet;
              // ??????????+ ??????
              const mergedResult = [
                ...this.accumulatedTranslationResult,
                ...this.currentBatchResult,
              ];
              this.setTranslationResult(mergedResult);
              this.updateTranslationProgress(mergedResult.length);
            } else {
              // ??????????????
              this.setTranslationResult(resultToSet);
              this.updateTranslationProgress(resultToSet.length);
            }
          }
        };

        const result = await translation.performTranslation(
          this.codeContent,
          onProgress
        );

        // ?????????????
        let isTruncated = false;
        if (translation.getIsTruncated) {
          isTruncated = translation.getIsTruncated();
          this.isTranslationTruncated = isTruncated;
        }

        // ??????????
        let finalResult = result;

        // ????????key????????????key??
        if (shouldAutoGenerateKey) {
          // ???????????key??
          // ???result ????????isResume ??
          finalResult = result.map((item, index) => {
            // ????????????????????????????
            const globalIndex = isResume ? startIndex + index : index;
            const preGeneratedKey = preGeneratedKeys[globalIndex];
            if (preGeneratedKey && preGeneratedKey.key) {
              return {
                ...item,
                key: preGeneratedKey.key, // ???????key
              };
            }
            return item;
          });
        }

        if (isResume) {
          // ??????????????????
          // result ???????????
          this.accumulatedTranslationResult = [
            ...this.accumulatedTranslationResult,
            ...finalResult,
          ];
        } else {
          // ????????????
          this.accumulatedTranslationResult = [...finalResult];
        }

        // ???????????????????
        this.setTranslationResult(this.accumulatedTranslationResult);
        // ???????
        this.updateTranslationProgress(
          this.accumulatedTranslationResult.length
        );

        // ?????????????????
        if (isTruncated && !isResume) {
          // ???????????????????
          const shouldAutoContinue =
            localStorage.getItem("auto_continue_on_truncate") !== "false"; // ????

          if (shouldAutoContinue) {
            // ????????
            const remainingContent = this.extractRemainingContent(result);
            if (remainingContent && remainingContent.trim()) {
              // ???????????????????????
              const currentContent = this.codeContent.trim();
              if (remainingContent.trim() !== currentContent) {
                // ?? codeContent ??????
                this.setCodeContent(remainingContent);
                // ??????????
                ElMessage.info(
                  t("translation.autoContinuingTranslation") ||
                    "Translation truncated. Auto-continuing with remaining content..."
                );
                // ??????????isResume=true ????????
                await this.continueTranslation(true);
                // ??????????????????????????????
                // ???????????????isTranslationTruncated ???? true
                if (!this.isTranslationTruncated) {
                  // ??????????????
                  ElMessage.success(t("translation.translationCompleted"));
                }
                return; // ????????????????
              } else {
                // ????????????????????????????????
                ElMessage.warning(
                  t("translation.cannotAutoContinue") ||
                    "Cannot auto-continue translation. Please reduce the content amount."
                );
              }
            } else {
              // ????????????????????????????
              // ?????????????????????
              this.isTranslationTruncated = false;
              ElMessage.info(
                t("translation.allContentTranslated") ||
                  "All content has been translated, but some results may be incomplete."
              );
            }
          } else {
            // ?????????????????????????
            // useTranslation ???????????????????
          }
        } else if (!isTruncated && !isResume) {
          // ?????????????????
          this.isTranslationTruncated = false;
        }

        // ????????????
        const translationData = translation.extractTranslationData(
          this.accumulatedTranslationResult
        );
        this.saveTranslationToLocal(translationData);
      } catch (error) {
        // ??????????
        this.closeDialog();
        console.error("Translation failed:", error);
        ElMessage.error(t("messages.translationFailed"));
      } finally {
        this.finishTranslation();
      }
    },

    /**
     * ????????
     */
    showLastTranslation() {
      if (this.hasLastTranslation) {
        // ???????????????
        const storage = useTranslationStorage();
        const dataWithEditState = storage.addEditingStates(
          this.lastTranslation
        );

        // ?????store?translationResult
        this.setTranslationResult(dataWithEditState);
        this.openDialog();
      } else {
        ElMessage.warning(t("messages.noPreviousTranslationFound"));
      }
    },

    /**
     * ??????
     * @param {string} suggestion - ????
     */
    handleUseSuggestion(suggestion) {
      this.showUserSuggestion(suggestion);
    },

    /**
     * ????????
     */
    handleUseSuggestionCancel() {
      this.hideUserSuggestion();
    },

    /**
     * ??????
     */
    handlePopoverHide() {
      this.hideUserSuggestion();
    },

    /**
     * ????????
     * @param {Object} row - ??????
     */
    handleDelete(row) {
      const index = this.translationResult.findIndex((item) => item === row);
      if (index > -1) {
        this.removeTranslationResult(index);

        // ??????
        this.saveTranslationToLocal(this.translationResult);

        // ????????????????
        if (this.translationResult.length === 0) {
          this.closeDialog();
          ElMessage.info(t("messages.allDataDeleted"));
        } else {
          ElMessage.success(t("messages.rowDeletedSuccessfully"));
        }
      }
    },

    /**
     * ????????
     * ??????????????????????localStorage
     */
    handleClear() {
      // ????????????????localStorage
      this.clearCodeContent();

      // ??????composable??
      const cache = useTranslationCache();
      cache.clearCache();
    },

    /**
     * ??????
     * @param {number} index - ??
     * @param {string} field - ????
     */
    enterEditMode(index, field) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index][`editing_${field}`] = true;
      }
    },

    /**
     * ??????????????
     * ????????????
     */
    initializeToDefaults() {
      this.codeContent = "";
      this.translationResult = [];
      this.dialogVisible = false;
      this.isTranslating = false;
      this.userSuggestion = "";
      this.userSuggestionVisible = false;
      this.hasLastTranslation = false;
      this.lastTranslation = [];

      // ???????
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });
    },
  },

  // ????????
  persist: {
    key: "translation-core-store",
    storage: {
      getItem: (key) => {
        if (typeof window !== "undefined" && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem(key);
        }
      },
    },
  },
});

