import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useExcelExport } from "../../../components/Excel/composables/useExcelExport";
import { t } from "../../../utils/i18n.js";
import { debugLog, debugError } from "../../../utils/debug.js";
import {
  getAvailableLanguages,
  DEFAULT_TARGET_LANGUAGE_CODES,
} from "../../config/languages.js";
import { searchKeysByNames } from "../../services/deduplicate/deduplicateService.js";
import { STORAGE_KEYS } from "../../config/storageKeys.js";
import { getProjectNameById as getStoredProjectNameById } from "../../repositories/projectRepository.js";
import { useAppStore } from "../app.js";
import {
  getLocalItem,
  piniaLocalStorage,
  removeLocalItem,
  setLocalItem,
} from "../../infrastructure/storage.js";

/**
 * 导出功能状态管理
 * 职责：仅管理「导出相关」状态（Excel 基线键、覆盖选项、目标语言等）。
 * 默认项目（defaultProjectId）由 app store 持有；本 store 的 updateDefaultProjectId 仅做基线键校验后委托 app 写入。
 */
export const useExportStore = defineStore("export", {
  state: () => ({
    // Excel 导出设置
    excelBaselineKey: "",
    excelOverwrite: false,

    // Auto Increment Key 开关状态
    autoIncrementKeyEnabled: false,

    // 目标语言设置（默认选中 Chinese 和 Japanese）
    targetLanguages: [...DEFAULT_TARGET_LANGUAGE_CODES],

    // 加载状态
    loadingStates: {
      export: false,
    },
  }),

  getters: {
    /** 全局默认项目 ID，来自 app store（只读） */
    defaultProjectId: () => useAppStore().defaultProjectId,

    // 检查是否正在加载
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 检查是否可以导出
    canExport: (state, getters) => !getters.isLoading,
  },

  actions: {
    /**
     * 设置加载状态
     * @param {string} key - 加载状态键
     * @param {boolean} loading - 加载状态
     */
    setLoading(key, loading) {
      if (key in this.loadingStates) {
        this.loadingStates[key] = loading;
      }
    },

    /**
     * 导出Excel文件
     * @param {Array} translationResult - 翻译结果
     */
    exportExcel(translationResult) {
      // 过滤掉完全空白的行（所有字段都为空）
      const filteredResult = translationResult.filter((row) => {
        if (!row || typeof row !== "object") return false;
        // 检查是否有任何非空字段
        return Object.values(row).some(
          (value) => value && String(value).trim() !== "",
        );
      });

      if (filteredResult.length === 0) {
        ElMessage.warning(t("messages.noTranslationDataToExport"));
        return;
      }

      const excelExport = useExcelExport();
      excelExport.exportExcel(filteredResult);
    },

    /**
     * 根据项目ID获取项目名称
     * @param {string} projectId - 项目ID
     * @returns {string|null} 项目名称
     */
    getProjectNameById(projectId) {
      return getStoredProjectNameById(projectId);
    },

    /**
     * 保存Excel基线键
     * @param {string} key - 基线键
     * @param {boolean} silent - 是否静默保存（不显示成功/失败消息，用于内部调用）
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveExcelBaselineKey(key, silent = false) {
      debugLog("[ExportStore] saveExcelBaselineKey called", {
        key,
        silent,
        stackTrace: new Error().stack,
      });

      if (!key?.trim()) {
        // 清空操作
        debugLog("[ExportStore] Clearing baseline key (empty value)");
        setLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY, "");
        this.excelBaselineKey = "";
        return true;
      }

      // 验证格式：key+数字
      if (!key.match(/^[a-zA-Z]+[0-9]+$/)) {
        debugLog("[ExportStore] Baseline key format validation failed:", key);
        if (!silent) {
          ElMessage.warning(
            t("translationSetting.exportBaselineKeySaveWarning"),
          );
        }
        return false;
      }

      // 校验 key 唯一性
      const trimmedKey = key.trim();
      const projectId = this.defaultProjectId;
      const projectName = projectId ? this.getProjectNameById(projectId) : null;
      const displayProjectName = projectName || "Default Project";

      debugLog(
        "[ExportStore] saveExcelBaselineKey - starting uniqueness check",
        {
          trimmedKey,
          projectId,
          displayProjectName,
          silent,
        },
      );

      if (projectId) {
        try {
          debugLog(
            "[ExportStore] Checking key uniqueness for:",
            trimmedKey,
            "in project:",
            projectId,
          );

          const searchResult = await searchKeysByNames(projectId, [trimmedKey]);

          // 构建已存在的 key_name 集合
          const existingKeyNames = new Set();
          if (searchResult.success && Array.isArray(searchResult.results)) {
            searchResult.results.forEach((result) => {
              if (result.key_name) {
                existingKeyNames.add(result.key_name);
              }
            });
          }

          // 检查 key 是否已存在
          if (existingKeyNames.has(trimmedKey)) {
            debugLog(
              "[ExportStore] saveExcelBaselineKey - key already exists, returning false",
              {
                trimmedKey,
                projectId,
                silent,
              },
            );
            if (!silent) {
              ElMessage.warning(
                `The key "${trimmedKey}" already exists in "${displayProjectName}". Please use a different key.`,
              );
            }
            return false;
          }

          debugLog("[ExportStore] Key uniqueness check passed:", trimmedKey);
        } catch (error) {
          // 如果API调用失败，记录错误但允许保存（避免网络问题阻止保存）
          console.warn("Failed to check key uniqueness:", error);
          debugError(
            "[ExportStore] Failed to check key uniqueness, proceeding with save:",
            error,
          );
          if (!silent) {
            ElMessage.warning(
              `Could not verify key uniqueness in "${displayProjectName}". The key will be saved, but please ensure it is unique.`,
            );
          }
        }
      } else {
        // 如果没有项目ID，提示用户配置项目
        debugLog(
          "[ExportStore] No default project ID configured, skipping key uniqueness check",
        );
        if (!silent) {
          ElMessage.warning(
            "Please configure Default Project first to verify key uniqueness.",
          );
        }
      }

      setLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY, trimmedKey);
      this.excelBaselineKey = trimmedKey;
      debugLog("[ExportStore] saveExcelBaselineKey - saved successfully", {
        trimmedKey,
        projectId,
        silent,
      });
      if (!silent) {
        ElMessage.success(t("translationSetting.exportBaselineKeySaveSuccess"));
      }
      return true;
    },

    /**
     * 更新Excel覆盖设置
     * @param {boolean} overwrite - 是否覆盖
     */
    updateExcelOverwrite(overwrite) {
      this.excelOverwrite = overwrite;
      setLocalItem(STORAGE_KEYS.EXCEL_OVERWRITE, overwrite);
    },

    /**
     * 设置 Auto Increment Key 开关状态
     * @param {boolean} enabled - 是否启用
     */
    setAutoIncrementKeyEnabled(enabled) {
      this.autoIncrementKeyEnabled = enabled;
      setLocalItem(STORAGE_KEYS.AUTO_INCREMENT_KEY_ENABLED, enabled);
      debugLog("[ExportStore] Auto Increment Key enabled set to:", enabled);
    },

    /**
     * 更新默认项目 ID：先做基线键唯一性校验，再委托 app store 写入。
     * @param {string} projectId - 项目ID
     */
    async updateDefaultProjectId(projectId) {
      const appStore = useAppStore();
      const oldProjectId = appStore.defaultProjectId;

      if (projectId === oldProjectId) {
        return;
      }

      if (projectId && oldProjectId && projectId !== oldProjectId) {
        const baselineKey =
          this.excelBaselineKey || getLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY);
        if (baselineKey?.trim()) {
          const projectName = this.getProjectNameById(projectId) || projectId;
          try {
            const searchResult = await searchKeysByNames(projectId, [
              baselineKey.trim(),
            ]);
            const exists =
              searchResult.success &&
              Array.isArray(searchResult.results) &&
              searchResult.results.some(
                (r) => r.key_name === baselineKey.trim(),
              );

            if (exists) {
              setLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY, "");
              this.excelBaselineKey = "";
              ElMessage.warning(
                `Baseline key "${baselineKey.trim()}" already exists in project "${projectName}". It has been cleared. Please configure a new baseline key.`,
              );
            }
          } catch (error) {
            debugError("[ExportStore] Failed to validate baseline key:", error);
            setLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY, "");
            this.excelBaselineKey = "";
            ElMessage.warning(
              `Failed to validate baseline key uniqueness in project "${projectName}". The baseline key has been cleared for safety.`,
            );
          }
        }
      }

      appStore.setDefaultProjectId(projectId || "");
      if (!projectId && this.excelBaselineKey) {
        await this.saveExcelBaselineKey("");
      }
    },

    /**
     * 更新目标语言设置
     * @param {Array<string>} languages - 选中的语言数组
     * @returns {boolean} 是否更新成功
     */
    updateTargetLanguages(languages) {
      debugLog("[ExportStore] Updating target languages:", languages);

      // 验证语言代码是否有效（只接受配置文件中的语言）
      const availableLanguages = getAvailableLanguages();
      const validLanguages = Array.isArray(languages)
        ? languages.filter((lang) =>
            availableLanguages.some((availLang) => availLang.code === lang),
          )
        : [];

      // 确保至少选择一个语言
      if (validLanguages.length === 0) {
        debugLog(
          "[ExportStore] Cannot clear all languages, keeping at least one",
        );
        return false; // 返回 false 表示更新失败，需要至少选择一个
      }

      this.targetLanguages = validLanguages;
      setLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, this.targetLanguages);
      debugLog(
        "[ExportStore] Target languages saved to localStorage:",
        this.targetLanguages,
      );
      return true;
    },

    /**
     * 获取所有可用语言（从配置文件读取）
     * @returns {Array<Object>} 语言列表
     */
    getAllLanguages() {
      return getAvailableLanguages();
    },

    /**
     * 初始化翻译设置
     * 从 localStorage 加载设置
     */
    initializeTranslationSettings() {
      try {
        debugLog("[ExportStore] Initializing translation settings...");
        // 加载 Excel 基线键
        const excelBaselineKey = getLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY);
        if (excelBaselineKey) {
          this.excelBaselineKey = excelBaselineKey;
          debugLog(
            "[ExportStore] Excel baseline key loaded:",
            excelBaselineKey,
          );
        }

        // 加载 Excel 覆盖设置
        const excelOverwrite = getLocalItem(STORAGE_KEYS.EXCEL_OVERWRITE);
        if (excelOverwrite !== null) {
          this.excelOverwrite = excelOverwrite === "true";
          debugLog(
            "[ExportStore] Excel overwrite setting loaded:",
            this.excelOverwrite,
          );
        }

        // 加载 Auto Increment Key 开关状态
        const autoIncrementKeyEnabled = getLocalItem(
          STORAGE_KEYS.AUTO_INCREMENT_KEY_ENABLED
        );
        if (autoIncrementKeyEnabled !== null) {
          this.autoIncrementKeyEnabled = autoIncrementKeyEnabled === "true";
          debugLog(
            "[ExportStore] Auto Increment Key enabled setting loaded:",
            this.autoIncrementKeyEnabled,
          );
        }

        // 默认项目 ID 由 app store 在 initializeApp 时从 projectRepository 加载，此处不再处理

        // 加载目标语言设置
        const targetLanguages = getLocalItem(STORAGE_KEYS.TARGET_LANGUAGES);
        if (targetLanguages) {
          try {
            const parsedLanguages = JSON.parse(targetLanguages);
            // 验证语言代码是否有效（从配置文件验证）
            const availableLanguages = getAvailableLanguages();
            const validLanguages = parsedLanguages.filter((lang) =>
              availableLanguages.some((availLang) => availLang.code === lang),
            );
            // 确保至少选择一个语言，如果没有则使用默认值
            if (validLanguages.length === 0) {
              this.targetLanguages = [...DEFAULT_TARGET_LANGUAGE_CODES];
              setLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, this.targetLanguages);
              debugLog(
                "[ExportStore] No valid languages found, using default:",
                this.targetLanguages,
              );
            } else {
              this.targetLanguages = validLanguages;
              debugLog(
                "[ExportStore] Target languages loaded from localStorage:",
                this.targetLanguages,
              );
            }
          } catch (error) {
            debugError(
              "[ExportStore] Failed to parse target languages:",
              error,
            );
            this.targetLanguages = [...DEFAULT_TARGET_LANGUAGE_CODES];
            setLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, this.targetLanguages);
          }
        } else {
          debugLog(
            "[ExportStore] No target languages in localStorage, using default: Chinese, Japanese",
          );
          this.targetLanguages = [...DEFAULT_TARGET_LANGUAGE_CODES];
          setLocalItem(STORAGE_KEYS.TARGET_LANGUAGES, this.targetLanguages);
        }
      } catch (error) {
        debugError(
          "[ExportStore] Failed to initialize translation settings:",
          error,
        );
      }
    },

    /**
     * 重置翻译设置（仅导出相关；默认项目由 app store 管理）
     */
    resetTranslationSettings() {
      this.excelBaselineKey = "";
      this.excelOverwrite = false;
      this.targetLanguages = [...DEFAULT_TARGET_LANGUAGE_CODES];

      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      removeLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY);
      removeLocalItem(STORAGE_KEYS.EXCEL_OVERWRITE);
      removeLocalItem(STORAGE_KEYS.TARGET_LANGUAGES);
    },

    /**
     * 初始化导出设置到默认值
     * 用于缓存清除时重置设置
     * 清除所有导出相关的 localStorage 数据
     *
     * 注意：清除顺序很重要
     * 1. 先清除 localStorage（包括 Pinia persist 存储）
     * 2. 再重置状态，避免 Pinia persist 插件恢复旧数据
     */
    initializeToDefaults() {
      // 先清除 localStorage 中的导出相关数据（包括 Pinia persist 存储）
      // 必须在重置状态之前清除，避免 Pinia persist 插件恢复数据
      try {
        removeLocalItem(STORAGE_KEYS.EXCEL_BASELINE_KEY);
        removeLocalItem(STORAGE_KEYS.EXCEL_OVERWRITE);
        removeLocalItem(STORAGE_KEYS.TARGET_LANGUAGES);
        removeLocalItem("export-store");
        debugLog("[ExportStore] Cleared export settings from localStorage");
      } catch (error) {
        debugError(
          "[ExportStore] Failed to clear export settings from localStorage:",
          error,
        );
      }

      this.excelBaselineKey = "";
      this.excelOverwrite = false;
      this.targetLanguages = [...DEFAULT_TARGET_LANGUAGE_CODES];

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      debugLog("[ExportStore] Export settings reset to defaults");
    },
  },

  // 启用持久化存储
  persist: {
    key: "export-store",
    storage: piniaLocalStorage,
  },
});
