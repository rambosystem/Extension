import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { t } from "../../../utils/i18n.js";
import { useTranslation } from "../../composables/Translation/useTranslation.js";
import { useTranslationStorage } from "../../composables/Translation/useTranslationStorage.js";
import { useTranslationCache } from "../../composables/Translation/useTranslationCache.js";
import { debugLog } from "../../../utils/debug.js";
import { generateKeysForTranslationResult } from "../../../utils/keyGenerator.js";
import { useExportStore } from "./export.js";
import { piniaLocalStorage } from "../../infrastructure/storage.js";
import {
  getAutoDeduplicationRawValue,
  getDeepSeekApiKey,
  getTargetLanguages,
  isAutoDeduplicationEnabled,
  loadLastTranslation,
  saveLastTranslation,
  shouldAutoContinueOnTruncate,
} from "../../repositories/translationStorageRepository.js";

/**
 * 翻译核心 Store
 * 存储访问改用 translationStorageRepository，持久化统一使用 piniaLocalStorage
 */
export const useTranslationCoreStore = defineStore("translationCore", {
  state: () => ({
    // 待翻译代码/文本内容
    codeContent: "",

    // 当前翻译结果列表
    translationResult: [],

    // 本次翻译使用的目标语言（与 targetLanguages 一致）
    translationTargetLanguages: [],

    // 结果对话框是否可见
    dialogVisible: false,

    // 是否正在翻译
    isTranslating: false,

    // 各环节加载状态
    loadingStates: {
      translation: false,
    },

    // 翻译进度（已完成条数 / 总条数）
    translationProgress: {
      finished: 0,
      total: 0,
    },

    // 本次翻译是否被截断
    isTranslationTruncated: false,

    // 开始翻译时的原始内容（用于续翻、剩余内容提取）
    originalCodeContent: "",

    // 累计翻译结果（含续翻合并）
    accumulatedTranslationResult: [],

    // 当前批次的翻译结果
    currentBatchResult: [],

    // 用户建议文案与可见性
    userSuggestion: "",
    userSuggestionVisible: false,

    // 表单引用与表单数据
    formRef: null,
    formData: {},

    // 是否有上次翻译、上次翻译数据
    hasLastTranslation: false,
    lastTranslation: [],
  }),

  getters: {
    // 是否有翻译结果
    hasTranslationResult: (state) => state.translationResult.length > 0,

    // 是否有输入内容
    hasContent: (state) => !!state.codeContent?.trim(),

    // 是否有任意加载中
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 翻译结果条数
    translationCount: (state) => state.translationResult.length,
  },

  actions: {
    /**
     * 设置加载状态
     * @param {string} key - 状态键
     * @param {boolean} loading - 是否加载中
     */
    setLoading(key, loading) {
      if (this.loadingStates.hasOwnProperty(key)) {
        this.loadingStates[key] = loading;
      }
    },

    /**
     * 设置待翻译内容
     * @param {string} content - 文本内容
     */
    setCodeContent(content) {
      this.codeContent = content || "";
    },

    /** 清空待翻译内容 */
    clearCodeContent() {
      this.codeContent = "";
    },

    /**
     * 设置翻译结果
     * @param {Array} result - 结果数组
     */
    setTranslationResult(result) {
      this.translationResult = result || [];
    },

    /**
     * 追加一条翻译结果
     * @param {Object} item - 单条结果
     */
    addTranslationResult(item) {
      this.translationResult.push(item);
    },

    /**
     * 删除指定索引的翻译结果
     * @param {number} index - 索引
     */
    removeTranslationResult(index) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult.splice(index, 1);
      }
    },

    /**
     * 更新指定索引的翻译结果
     * @param {number} index - 索引
     * @param {Object} item - 更新项
     */
    updateTranslationResult(index, item) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index] = {
          ...this.translationResult[index],
          ...item,
        };
      }
    },

    /** 清空翻译结果 */
    clearTranslationResult() {
      this.translationResult = [];
    },

    /**
     * 设置结果对话框可见性
     * @param {boolean} visible - 是否可见
     */
    setDialogVisible(visible) {
      this.dialogVisible = visible;
    },

    /** 打开结果对话框 */
    openDialog() {
      this.dialogVisible = true;
    },

    /** 关闭结果对话框 */
    closeDialog() {
      this.dialogVisible = false;
    },

    /**
     * 获取当前状态文案（用于 UI）
     * @returns {string} 状态文案
     */
    getStatusText() {
      if (this.loadingStates.translation) {
        return "Translating...";
      }
      return "Loading...";
    },

    /**
     * 设置是否正在翻译
     * @param {boolean} translating - 是否正在翻译
     */
    setTranslating(translating) {
      this.isTranslating = translating;
    },

    /**
     * 开始翻译（初始化进度与截断状态）
     * @param {number} totalCount - 总条数
     * @param {boolean} isResume - 是否为续翻
     */
    startTranslation(totalCount = 0, isResume = false) {
      // 非续翻时清空结果并记录原始内容
      if (!isResume) {
        this.clearTranslationResult();
        this.accumulatedTranslationResult = [];
        this.currentBatchResult = [];
        // 记录原始内容
        this.originalCodeContent = this.codeContent;
      } else {
        // 续翻只清空当前批次
        this.currentBatchResult = [];
      }
      this.isTranslating = true;
      this.setLoading("translation", true);
      // 重置截断标记
      this.isTranslationTruncated = false;
      // 初始化进度
      this.translationProgress = {
        finished: isResume ? this.accumulatedTranslationResult.length : 0,
        total: totalCount,
      };
    },

    /** 结束翻译（清除加载与进度） */
    finishTranslation() {
      this.isTranslating = false;
      this.setLoading("translation", false);
      // 进度收尾
      this.translationProgress = {
        finished: this.accumulatedTranslationResult.length || 0,
        total: 0,
      };
    },

    /**
     * 更新翻译进度（已完成条数）
     * @param {number} finished - 已完成条数
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
     * 设置用户建议文案
     * @param {string} suggestion - 建议文案
     */
    setUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
    },

    /**
     * 显示用户建议
     * @param {string} suggestion - 建议文案
     */
    showUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
      this.userSuggestionVisible = true;
    },

    /** 隐藏用户建议 */
    hideUserSuggestion() {
      this.userSuggestion = "";
      this.userSuggestionVisible = false;
    },

    /**
     * 设置上次翻译数据
     * @param {Array} translation - 翻译结果数组
     */
    setLastTranslation(translation) {
      this.lastTranslation = translation || [];
      this.hasLastTranslation = translation && translation.length > 0;
    },

    /** 清空上次翻译 */
    clearLastTranslation() {
      this.lastTranslation = [];
      this.hasLastTranslation = false;
    },

    /**
     * 从数据中剥离编辑态字段，得到纯翻译数据
     * @param {Array} data - 含 editing_ 字段的数据
     * @returns {Array} 纯翻译数据
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
     * 保存翻译结果到本地（通过 repository）
     * @param {Array} data - 当前翻译结果（可含编辑态）
     */
    saveTranslationToLocal(data) {
      try {
        // 剥离编辑态后保存
        const translationData = this.extractTranslationData(data);

        // 连同 translationData、targetLanguages 写入
        const dataToSave = {
          translationData,
          targetLanguages: this.translationTargetLanguages || [],
        };

        saveLastTranslation(dataToSave);
        this.setLastTranslation(translationData);
      } catch (error) {
        console.error("Failed to save translation to local storage:", error);
      }
    },

    /** 从本地加载上次翻译（通过 repository） */
    loadLastTranslation() {
      try {
        const parsed = loadLastTranslation();
        if (parsed) {
          this.setLastTranslation(parsed.translationData || []);
          this.translationTargetLanguages = parsed.targetLanguages || [];
        }
      } catch (error) {
        console.error("Failed to load last translation from storage:", error);
      }
    },

    /**
     * 触发翻译：校验 API Key、内容、去重开关后执行或返回需去重
     */
    async handleTranslate() {
      // 防止重复点击
      if (this.isTranslating) {
        return;
      }

      // 校验 API Key 是否已配置
      const apiKey = getDeepSeekApiKey();
      if (!apiKey) {
        ElMessage.warning(t("messages.pleaseConfigureAPIKeyFirst"));
        return;
      }

      // 校验是否有输入内容
      if (!this.codeContent?.trim()) {
        ElMessage.warning(t("messages.pleaseEnterContentToTranslate"));
        return;
      }

      // 从 repository 读取去重开关
      const autoDeduplicationEnabled = isAutoDeduplicationEnabled();

      debugLog("Translation deduplication check:");
      debugLog(
        "- auto_deduplication_enabled value:",
        getAutoDeduplicationRawValue()
      );
      debugLog("- autoDeduplicationEnabled:", autoDeduplicationEnabled);

      if (autoDeduplicationEnabled) {
        // 启用去重时先走去重流程
        debugLog(
          "Deduplication is enabled, returning needsDeduplication: true"
        );
        return { needsDeduplication: true };
      }

      debugLog("Deduplication is disabled, proceeding with normal translation");
      await this.continueTranslation();
      return { needsDeduplication: false };
    },

    /**
     * 根据已翻译结果提取剩余未翻译内容
     * @param {Array} translatedResult - 已翻译结果
     * @returns {string} 剩余内容（按行拼接）
     */
    extractRemainingContent(translatedResult) {
      if (!this.originalCodeContent) {
        return "";
      }

      // 原始内容按行
      const originalLines = this.originalCodeContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // 已翻译的 en 文本集合
      const translatedLines = new Set();
      translatedResult.forEach((item) => {
        const enText = item.en || "";
        if (enText.trim()) {
          translatedLines.add(enText.trim());
        }
      });

      // 未出现在已翻译中的行
      const remainingLines = originalLines.filter((line) => {
        const trimmedLine = line.trim();
        return trimmedLine && !translatedLines.has(trimmedLine);
      });

      return remainingLines.join("\n");
    },

    /**
     * 执行翻译或续翻（拉取 targetLanguages、生成 key、调用 useTranslation）
     * @param {boolean} isResume - 是否为续翻
     */
    async continueTranslation(isResume = false) {
      // 当前内容行数
      const textLines = this.codeContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      const totalCount = textLines.length;

      // 续翻时总条数以原始内容为准
      const finalTotalCount = isResume
        ? this.originalCodeContent
            .trim()
            .split("\n")
            .filter((line) => line.trim()).length
        : totalCount;

      this.startTranslation(finalTotalCount, isResume);

      try {
        this.openDialog();

        // 从 repository 读取 targetLanguages
        try {
          const targetLanguages = getTargetLanguages();
          this.translationTargetLanguages = targetLanguages;
        } catch (error) {
          console.warn("Failed to save target languages:", error);
          this.translationTargetLanguages = [];
        }

        // 是否自动生成 key
        const exportStore = useExportStore();
        const shouldAutoGenerateKey =
          exportStore.autoIncrementKeyEnabled &&
          exportStore.excelBaselineKey?.trim();

        // 续翻时的起始索引
        const startIndex = isResume
          ? this.accumulatedTranslationResult.length
          : 0;

        // 若启用自动 key，预生成 key 列表
        let preGeneratedKeys = [];
        if (shouldAutoGenerateKey) {
          const emptyResults = Array(finalTotalCount)
            .fill(null)
            .map(() => ({}));
          preGeneratedKeys = generateKeysForTranslationResult(
            emptyResults,
            exportStore.excelBaselineKey,
            startIndex
          );
        }

        const translation = useTranslation();

        // 进度回调：合并预生成 key，更新结果与进度
        const onProgress = (partialResult, fullText) => {
          if (partialResult && Array.isArray(partialResult)) {
            let resultToSet = partialResult;

            if (shouldAutoGenerateKey) {
              resultToSet = partialResult.map((item, index) => {
                const globalIndex = isResume ? startIndex + index : index;
                const preGeneratedKey = preGeneratedKeys[globalIndex];
                if (preGeneratedKey && preGeneratedKey.key) {
                  return {
                    ...item,
                    key: preGeneratedKey.key,
                  };
                }
                return item;
              });
            }

            if (isResume) {
              this.currentBatchResult = resultToSet;
              const mergedResult = [
                ...this.accumulatedTranslationResult,
                ...this.currentBatchResult,
              ];
              this.setTranslationResult(mergedResult);
              this.updateTranslationProgress(mergedResult.length);
            } else {
              this.setTranslationResult(resultToSet);
              this.updateTranslationProgress(resultToSet.length);
            }
          }
        };

        const result = await translation.performTranslation(
          this.codeContent,
          onProgress
        );

        let isTruncated = false;
        if (translation.getIsTruncated) {
          isTruncated = translation.getIsTruncated();
          this.isTranslationTruncated = isTruncated;
        }

        let finalResult = result;

        if (shouldAutoGenerateKey) {
          finalResult = result.map((item, index) => {
            const globalIndex = isResume ? startIndex + index : index;
            const preGeneratedKey = preGeneratedKeys[globalIndex];
            if (preGeneratedKey && preGeneratedKey.key) {
              return {
                ...item,
                key: preGeneratedKey.key,
              };
            }
            return item;
          });
        }

        if (isResume) {
          this.accumulatedTranslationResult = [
            ...this.accumulatedTranslationResult,
            ...finalResult,
          ];
        } else {
          this.accumulatedTranslationResult = [...finalResult];
        }

        this.setTranslationResult(this.accumulatedTranslationResult);
        this.updateTranslationProgress(
          this.accumulatedTranslationResult.length
        );

        if (isTruncated && !isResume) {
          const shouldAutoContinue = shouldAutoContinueOnTruncate();

          if (shouldAutoContinue) {
            const remainingContent = this.extractRemainingContent(result);
            if (remainingContent && remainingContent.trim()) {
              const currentContent = this.codeContent.trim();
              if (remainingContent.trim() !== currentContent) {
                this.setCodeContent(remainingContent);
                ElMessage.info(
                  t("translation.autoContinuingTranslation") ||
                    "Translation truncated. Auto-continuing with remaining content..."
                );
                await this.continueTranslation(true);
                if (!this.isTranslationTruncated) {
                  ElMessage.success(t("translation.translationCompleted"));
                }
                return;
              } else {
                ElMessage.warning(
                  t("translation.cannotAutoContinue") ||
                    "Cannot auto-continue translation. Please reduce the content amount."
                );
              }
            } else {
              this.isTranslationTruncated = false;
              ElMessage.info(
                t("translation.allContentTranslated") ||
                  "All content has been translated, but some results may be incomplete."
              );
            }
          }
        } else if (!isTruncated && !isResume) {
          this.isTranslationTruncated = false;
        }

        const translationData = translation.extractTranslationData(
          this.accumulatedTranslationResult
        );
        this.saveTranslationToLocal(translationData);
      } catch (error) {
        this.closeDialog();
        console.error("Translation failed:", error);
        ElMessage.error(t("messages.translationFailed"));
      } finally {
        this.finishTranslation();
      }
    },

    /** 展示上次翻译（从 state 取 lastTranslation，加编辑态后打开对话框） */
    showLastTranslation() {
      if (this.hasLastTranslation) {
        const storage = useTranslationStorage();
        const dataWithEditState = storage.addEditingStates(
          this.lastTranslation
        );

        this.setTranslationResult(dataWithEditState);
        this.openDialog();
      } else {
        ElMessage.warning(t("messages.noPreviousTranslationFound"));
      }
    },

    /**
     * 使用建议文案
     * @param {string} suggestion - 建议文案
     */
    handleUseSuggestion(suggestion) {
      this.showUserSuggestion(suggestion);
    },

    /** 取消使用建议 */
    handleUseSuggestionCancel() {
      this.hideUserSuggestion();
    },

    /** 气泡关闭时隐藏建议 */
    handlePopoverHide() {
      this.hideUserSuggestion();
    },

    /**
     * 删除一行翻译结果
     * @param {Object} row - 行数据
     */
    handleDelete(row) {
      const index = this.translationResult.findIndex((item) => item === row);
      if (index > -1) {
        this.removeTranslationResult(index);

        this.saveTranslationToLocal(this.translationResult);

        if (this.translationResult.length === 0) {
          this.closeDialog();
          ElMessage.info(t("messages.allDataDeleted"));
        } else {
          ElMessage.success(t("messages.rowDeletedSuccessfully"));
        }
      }
    },

    /**
     * 清空内容与翻译缓存
     * 清空 codeContent 并调用 useTranslationCache 清除缓存
     */
    handleClear() {
      this.clearCodeContent();

      const cache = useTranslationCache();
      cache.clearCache();
    },

    /**
     * 进入某行某字段的编辑态
     * @param {number} index - 行索引
     * @param {string} field - 字段名
     */
    enterEditMode(index, field) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index][`editing_${field}`] = true;
      }
    },

    /**
     * 重置翻译核心状态到默认值（用于缓存清除）
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

      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });
    },
  },

  /** 持久化：统一使用 storage 适配层 */
  persist: {
    key: "translation-core-store",
    storage: piniaLocalStorage,
  },
});

