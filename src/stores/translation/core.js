import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { t } from "../../utils/i18n.js";
import { useTranslation } from "../../composables/Translation/useTranslation.js";
import { useTranslationStorage } from "../../composables/Translation/useTranslationStorage.js";
import { useTranslationCache } from "../../composables/Translation/useTranslationCache.js";
import { debugLog } from "../../utils/debug.js";

/**
 * 翻译核心功能状态管理
 * 管理翻译内容、结果、对话框状态等核心功能
 */
export const useTranslationCoreStore = defineStore("translationCore", {
  state: () => ({
    // 翻译内容
    codeContent: "",

    // 翻译结果
    translationResult: [],

    // 翻译时的目标语言配置（保存翻译时的 targetLanguages）
    translationTargetLanguages: [],

    // 对话框状态
    dialogVisible: false,

    // 翻译状态
    isTranslating: false,

    // 加载状态
    loadingStates: {
      translation: false,
    },

    // 翻译进度计数器
    translationProgress: {
      finished: 0,
      total: 0,
    },

    // 翻译截断状态
    isTranslationTruncated: false,

    // 原始输入内容（用于截断后继续翻译）
    originalCodeContent: "",

    // 已累积的翻译结果（用于合并多次翻译的结果）
    accumulatedTranslationResult: [],

    // 当前批次的翻译结果（用于流式更新时避免重复）
    currentBatchResult: [],

    // 用户建议
    userSuggestion: "",
    userSuggestionVisible: false,

    // 表单引用
    formRef: null,
    formData: {},

    // 缓存相关
    hasLastTranslation: false,
    lastTranslation: [],
  }),

  getters: {
    // 检查是否有翻译结果
    hasTranslationResult: (state) => state.translationResult.length > 0,

    // 检查是否有待翻译内容
    hasContent: (state) => !!state.codeContent?.trim(),

    // 检查是否正在加载
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 获取翻译结果数量
    translationCount: (state) => state.translationResult.length,
  },

  actions: {
    /**
     * 设置加载状态
     * @param {string} key - 加载状态键
     * @param {boolean} loading - 加载状态
     */
    setLoading(key, loading) {
      if (this.loadingStates.hasOwnProperty(key)) {
        this.loadingStates[key] = loading;
      }
    },

    /**
     * 设置翻译内容
     * @param {string} content - 翻译内容
     */
    setCodeContent(content) {
      this.codeContent = content || "";
    },

    /**
     * 清空翻译内容
     */
    clearCodeContent() {
      this.codeContent = "";
    },

    /**
     * 设置翻译结果
     * @param {Array} result - 翻译结果数组
     */
    setTranslationResult(result) {
      this.translationResult = result || [];
    },

    /**
     * 添加翻译结果
     * @param {Object} item - 翻译项
     */
    addTranslationResult(item) {
      this.translationResult.push(item);
    },

    /**
     * 删除翻译结果项
     * @param {number} index - 索引
     */
    removeTranslationResult(index) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult.splice(index, 1);
      }
    },

    /**
     * 更新翻译结果项
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

    /**
     * 清空翻译结果
     */
    clearTranslationResult() {
      this.translationResult = [];
    },

    /**
     * 设置对话框可见性
     * @param {boolean} visible - 是否可见
     */
    setDialogVisible(visible) {
      this.dialogVisible = visible;
    },

    /**
     * 打开对话框
     */
    openDialog() {
      this.dialogVisible = true;
    },

    /**
     * 关闭对话框
     */
    closeDialog() {
      this.dialogVisible = false;
    },

    /**
     * 获取当前状态的显示文本
     * @returns {string} 状态显示文本
     */
    getStatusText() {
      if (this.loadingStates.translation) {
        return "Translating...";
      }
      return "Loading...";
    },

    /**
     * 设置翻译状态
     * @param {boolean} translating - 是否正在翻译
     */
    setTranslating(translating) {
      this.isTranslating = translating;
    },

    /**
     * 开始翻译
     * @param {number} totalCount - 总翻译数量（可选）
     * @param {boolean} isResume - 是否为继续翻译（不重置累积结果）
     */
    startTranslation(totalCount = 0, isResume = false) {
      // 如果不是继续翻译，清空上一次的翻译结果和累积结果
      if (!isResume) {
        this.clearTranslationResult();
        this.accumulatedTranslationResult = [];
        this.currentBatchResult = [];
        // 保存原始输入内容
        this.originalCodeContent = this.codeContent;
      } else {
        // 继续翻译时，清空当前批次结果
        this.currentBatchResult = [];
      }
      this.isTranslating = true;
      this.setLoading("translation", true);
      // 重置截断状态
      this.isTranslationTruncated = false;
      // 初始化进度计数器
      this.translationProgress = {
        finished: isResume ? this.accumulatedTranslationResult.length : 0,
        total: totalCount,
      };
    },

    /**
     * 完成翻译
     */
    finishTranslation() {
      this.isTranslating = false;
      this.setLoading("translation", false);
      // 重置进度计数器（保留累积结果的数量）
      this.translationProgress = {
        finished: this.accumulatedTranslationResult.length || 0,
        total: 0,
      };
      // 注意：不重置截断状态，以便在对话框中显示警告
    },

    /**
     * 更新翻译进度
     * @param {number} finished - 已完成数量
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
     * 设置用户建议
     * @param {string} suggestion - 建议内容
     */
    setUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
    },

    /**
     * 显示用户建议
     * @param {string} suggestion - 建议内容
     */
    showUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
      this.userSuggestionVisible = true;
    },

    /**
     * 隐藏用户建议
     */
    hideUserSuggestion() {
      this.userSuggestion = "";
      this.userSuggestionVisible = false;
    },

    /**
     * 设置上次翻译结果
     * @param {Array} translation - 翻译结果
     */
    setLastTranslation(translation) {
      this.lastTranslation = translation || [];
      this.hasLastTranslation = translation && translation.length > 0;
    },

    /**
     * 清空上次翻译结果
     */
    clearLastTranslation() {
      this.lastTranslation = [];
      this.hasLastTranslation = false;
    },

    /**
     * 提取纯翻译数据（移除编辑状态字段）
     * @param {Array} data - 包含编辑状态的翻译数据
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
     * 保存翻译结果到本地存储
     * @param {Array} data - 翻译数据（可能包含编辑状态）
     */
    saveTranslationToLocal(data) {
      try {
        // 提取纯数据（移除编辑状态字段）
        const translationData = this.extractTranslationData(data);

        // 将 translationData 和 targetLanguages 一起保存
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
     * 从本地存储加载翻译结果
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
     * 执行翻译并处理结果
     */
    async handleTranslate() {
      // 防重复请求检查
      if (this.isTranslating) {
        return;
      }

      // 检查 API Key 是否存在
      const apiKey = localStorage.getItem("deepseek_api_key");
      if (!apiKey) {
        ElMessage.warning(t("messages.pleaseConfigureAPIKeyFirst"));
        return;
      }

      // 检查输入内容是否为空
      if (!this.codeContent?.trim()) {
        ElMessage.warning(t("messages.pleaseEnterContentToTranslate"));
        return;
      }

      // 检查是否启用了自动去重
      const autoDeduplicationEnabled =
        localStorage.getItem("auto_deduplication_enabled") === "true";

      // 调试信息：显示去重检查结果
      debugLog("Translation deduplication check:");
      debugLog(
        "- auto_deduplication_enabled value:",
        localStorage.getItem("auto_deduplication_enabled")
      );
      debugLog("- autoDeduplicationEnabled:", autoDeduplicationEnabled);

      if (autoDeduplicationEnabled) {
        // 需要去重，但这里不处理，由调用方处理
        debugLog(
          "Deduplication is enabled, returning needsDeduplication: true"
        );
        return { needsDeduplication: true };
      }

      // 正常翻译流程
      debugLog("Deduplication is disabled, proceeding with normal translation");
      await this.continueTranslation();
      return { needsDeduplication: false };
    },

    /**
     * 提取未翻译的内容
     * @param {Array} translatedResult - 已翻译的结果数组
     * @returns {string} 未翻译的内容（按行分隔）
     */
    extractRemainingContent(translatedResult) {
      if (!this.originalCodeContent) {
        return "";
      }

      // 获取原始输入的所有行
      const originalLines = this.originalCodeContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // 从已翻译结果中提取已翻译的原文（en字段）
      const translatedLines = new Set();
      translatedResult.forEach((item) => {
        const enText = item.en || "";
        if (enText.trim()) {
          translatedLines.add(enText.trim());
        }
      });

      // 找出未翻译的行
      const remainingLines = originalLines.filter((line) => {
        const trimmedLine = line.trim();
        return trimmedLine && !translatedLines.has(trimmedLine);
      });

      return remainingLines.join("\n");
    },

    /**
     * 继续翻译流程（在自动去重完成后调用）
     * @param {boolean} isResume - 是否为继续翻译（截断后自动继续）
     */
    async continueTranslation(isResume = false) {
      // 计算总翻译数量（按行数）
      const textLines = this.codeContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      const totalCount = textLines.length;

      // 如果是继续翻译，总数量应该是原始内容的总行数
      const finalTotalCount = isResume
        ? this.originalCodeContent
            .trim()
            .split("\n")
            .filter((line) => line.trim()).length
        : totalCount;

      this.startTranslation(finalTotalCount, isResume);

      try {
        // 先弹出对话框，显示加载状态
        this.openDialog();

        // 保存翻译时的 targetLanguages
        try {
          const targetLanguages = JSON.parse(
            localStorage.getItem("target_languages") || "[]"
          );
          this.translationTargetLanguages = targetLanguages;
        } catch (error) {
          console.warn("Failed to save target languages:", error);
          this.translationTargetLanguages = [];
        }

        // 使用翻译模块执行翻译
        const translation = useTranslation();

        // 创建流式更新回调
        const onProgress = (partialResult, fullText) => {
          if (partialResult && Array.isArray(partialResult)) {
            if (isResume) {
              // 继续翻译：更新当前批次结果，并合并显示
              // partialResult 是当前批次的完整结果（从当前批次开始）
              this.currentBatchResult = partialResult;
              // 合并显示：累积结果 + 当前批次结果
              const mergedResult = [
                ...this.accumulatedTranslationResult,
                ...this.currentBatchResult,
              ];
              this.setTranslationResult(mergedResult);
              this.updateTranslationProgress(mergedResult.length);
            } else {
              // 第一次翻译：直接显示当前结果
              this.setTranslationResult(partialResult);
              this.updateTranslationProgress(partialResult.length);
            }
          }
        };

        const result = await translation.performTranslation(
          this.codeContent,
          onProgress
        );

        // 获取截断状态（如果可用）
        let isTruncated = false;
        if (translation.getIsTruncated) {
          isTruncated = translation.getIsTruncated();
          this.isTranslationTruncated = isTruncated;
        }

        // 合并结果到累积结果中
        if (isResume) {
          // 继续翻译：追加当前批次结果到累积结果
          // result 是当前批次的最终结果
          this.accumulatedTranslationResult = [
            ...this.accumulatedTranslationResult,
            ...result,
          ];
        } else {
          // 第一次翻译：直接使用结果
          this.accumulatedTranslationResult = [...result];
        }

        // 最终设置完整结果（显示累积的所有结果）
        // key的生成由Excel组件的auto increment功能处理
        this.setTranslationResult(this.accumulatedTranslationResult);
        // 更新最终进度
        this.updateTranslationProgress(this.accumulatedTranslationResult.length);

        // 如果检测到截断，尝试自动继续翻译
        if (isTruncated && !isResume) {
          // 只在第一次翻译时自动继续，避免无限递归
          const shouldAutoContinue =
            localStorage.getItem("auto_continue_on_truncate") !== "false"; // 默认启用

          if (shouldAutoContinue) {
            // 提取未翻译的内容
            const remainingContent = this.extractRemainingContent(result);
            if (remainingContent && remainingContent.trim()) {
              // 检查剩余内容是否与当前内容相同（避免无限循环）
              const currentContent = this.codeContent.trim();
              if (remainingContent.trim() !== currentContent) {
                // 更新 codeContent 为剩余内容
                this.setCodeContent(remainingContent);
                // 显示继续翻译的提示
                ElMessage.info(
                  t("translation.autoContinuingTranslation") ||
                    "Translation truncated. Auto-continuing with remaining content..."
                );
                // 递归继续翻译（使用 isResume=true 表示继续翻译）
                await this.continueTranslation(true);
                // 如果继续翻译成功完成，清除截断状态（因为已经全部翻译完成）
                // 注意：如果继续翻译时再次截断，isTranslationTruncated 会保持为 true
                if (!this.isTranslationTruncated) {
                  // 全部翻译完成，显示成功消息
                  ElMessage.success(t("translation.translationCompleted"));
                }
                return; // 提前返回，避免执行后续的保存逻辑
              } else {
                // 如果剩余内容与当前内容相同，说明无法继续，保持截断状态并显示警告
                ElMessage.warning(
                  t("translation.cannotAutoContinue") ||
                    "Cannot auto-continue translation. Please reduce the content amount."
                );
              }
            } else {
              // 没有剩余内容，说明已经全部翻译完成（虽然被截断标记了）
              // 清除截断状态，因为实际上已经全部翻译完成
              this.isTranslationTruncated = false;
              ElMessage.info(
                t("translation.allContentTranslated") ||
                  "All content has been translated, but some results may be incomplete."
              );
            }
          } else {
            // 自动继续功能未启用，保持截断状态，让对话框显示警告
            // useTranslation 中已经显示了警告消息，这里不需要重复
          }
        } else if (!isTruncated && !isResume) {
          // 翻译完成且没有截断，清除截断状态
          this.isTranslationTruncated = false;
        }

        // 提取纯数据并保存到存储
        const translationData = translation.extractTranslationData(
          this.accumulatedTranslationResult
        );
        this.saveTranslationToLocal(translationData);
      } catch (error) {
        // 翻译失败时关闭对话框
        this.closeDialog();
        console.error("Translation failed:", error);
        ElMessage.error(t("messages.translationFailed"));
      } finally {
        this.finishTranslation();
      }
    },

    /**
     * 显示上次翻译结果
     */
    showLastTranslation() {
      if (this.hasLastTranslation) {
        // 为加载的数据添加编辑状态属性
        const storage = useTranslationStorage();
        const dataWithEditState = storage.addEditingStates(
          this.lastTranslation
        );

        // 直接设置到store的translationResult
        this.setTranslationResult(dataWithEditState);
        this.openDialog();
      } else {
        ElMessage.warning(t("messages.noPreviousTranslationFound"));
      }
    },

    /**
     * 处理用户建议
     * @param {string} suggestion - 建议内容
     */
    handleUseSuggestion(suggestion) {
      this.showUserSuggestion(suggestion);
    },

    /**
     * 处理用户建议取消
     */
    handleUseSuggestionCancel() {
      this.hideUserSuggestion();
    },

    /**
     * 处理弹窗隐藏
     */
    handlePopoverHide() {
      this.hideUserSuggestion();
    },

    /**
     * 删除翻译结果行
     * @param {Object} row - 要删除的行
     */
    handleDelete(row) {
      const index = this.translationResult.findIndex((item) => item === row);
      if (index > -1) {
        this.removeTranslationResult(index);

        // 更新本地存储
        this.saveTranslationToLocal(this.translationResult);

        // 如果删除后没有数据了，关闭对话框
        if (this.translationResult.length === 0) {
          this.closeDialog();
          ElMessage.info(t("messages.allDataDeleted"));
        } else {
          ElMessage.success(t("messages.rowDeletedSuccessfully"));
        }
      }
    },

    /**
     * 清除编辑器内容
     * 重构后的版本：只调用初始化函数，禁止直接操作localStorage
     */
    handleClear() {
      // 只重置编辑器相关状态，不直接操作localStorage
      this.clearCodeContent();

      // 清空缓存通过composable处理
      const cache = useTranslationCache();
      cache.clearCache();
    },

    /**
     * 进入编辑模式
     * @param {number} index - 索引
     * @param {string} field - 字段名
     */
    enterEditMode(index, field) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index][`editing_${field}`] = true;
      }
    },

    /**
     * 初始化翻译核心状态到默认值
     * 用于缓存清除时重置状态
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

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });
    },
  },

  // 启用持久化存储
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
