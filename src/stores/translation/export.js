import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useExcelExport } from "../../composables/Excel/useExcelExport.js";
import { useI18n } from "../../composables/Core/useI18n.js";
import { debugLog, debugError } from "../../utils/debug.js";
import { getAvailableLanguages } from "../../config/languages.js";
import { searchKeysByNames } from "../../services/deduplicate/deduplicateService.js";

/**
 * 导出功能状态管理
 * 管理Excel导出设置和相关功能
 * 注意：设置相关方法已重命名为 Translation Settings
 */
export const useExportStore = defineStore("export", {
  state: () => ({
    // Excel 导出设置
    excelBaselineKey: "",
    excelOverwrite: false,

    // 默认项目设置
    defaultProjectId: "",

    // 目标语言设置（默认选中 Chinese 和 Japanese）
    targetLanguages: ["Chinese", "Japanese"],

    // 加载状态
    loadingStates: {
      export: false,
    },
  }),

  getters: {
    // 检查是否正在加载
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 检查是否可以导出
    canExport: (state) => !state.isLoading,
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
     * 导出Excel文件
     * @param {Array} translationResult - 翻译结果
     */
    exportExcel(translationResult) {
      // 过滤掉完全空白的行（所有字段都为空）
      const filteredResult = translationResult.filter((row) => {
        if (!row || typeof row !== "object") return false;
        // 检查是否有任何非空字段
        return Object.values(row).some(
          (value) => value && String(value).trim() !== ""
        );
      });

      if (filteredResult.length === 0) {
        ElMessage.warning("No translation data to export");
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
      try {
        const projects = localStorage.getItem("lokalise_projects");
        if (projects) {
          const parsedProjects = JSON.parse(projects);
          if (Array.isArray(parsedProjects)) {
            const project = parsedProjects.find(
              (p) => p.project_id === projectId
            );
            if (project && project.name) {
              return project.name;
            }
          }
        }
        return null;
      } catch (error) {
        debugError("[ExportStore] Failed to get project name by ID:", error);
        return null;
      }
    },

    /**
     * 保存Excel基线键
     * @param {string} key - 基线键
     * @param {boolean} silent - 是否静默保存（不显示成功/失败消息，用于内部调用）
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveExcelBaselineKey(key, silent = false) {
      const { t } = useI18n();

      debugLog("[ExportStore] saveExcelBaselineKey called", {
        key,
        silent,
        stackTrace: new Error().stack,
      });

      if (!key?.trim()) {
        // 清空操作
        debugLog("[ExportStore] Clearing baseline key (empty value)");
        localStorage.setItem("excel_baseline_key", "");
        this.excelBaselineKey = "";
        return true;
      }

      // 验证格式：key+数字
      if (!key.match(/^[a-zA-Z]+[0-9]+$/)) {
        debugLog("[ExportStore] Baseline key format validation failed:", key);
        if (!silent) {
          ElMessage.warning(
            t("translationSetting.exportBaselineKeySaveWarning")
          );
        }
        return false;
      }

      // 校验key唯一性
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
        }
      );

      if (projectId) {
        try {
          debugLog(
            "[ExportStore] Checking key uniqueness for:",
            trimmedKey,
            "in project:",
            projectId
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

          // 检查key是否已存在
          if (existingKeyNames.has(trimmedKey)) {
            debugLog(
              "[ExportStore] saveExcelBaselineKey - key already exists, returning false",
              {
                trimmedKey,
                projectId,
                silent,
              }
            );
            if (!silent) {
              ElMessage.warning(
                `The key "${trimmedKey}" already exists in "${displayProjectName}". Please use a different key.`
              );
            }
            return false;
          }

          debugLog("[ExportStore] Key uniqueness check passed:", trimmedKey);
        } catch (error) {
          // 如果API调用失败，记录警告但允许保存（避免网络问题阻止保存）
          console.warn("Failed to check key uniqueness:", error);
          debugError(
            "[ExportStore] Failed to check key uniqueness, proceeding with save:",
            error
          );
          if (!silent) {
            ElMessage.warning(
              `Could not verify key uniqueness in "${displayProjectName}". The key will be saved, but please ensure it is unique.`
            );
          }
        }
      } else {
        // 如果没有项目ID，提示用户配置项目
        debugLog(
          "[ExportStore] No default project ID configured, skipping key uniqueness check"
        );
        if (!silent) {
          ElMessage.warning(
            "Please configure Default Project first to verify key uniqueness."
          );
        }
      }

      localStorage.setItem("excel_baseline_key", trimmedKey);
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
      localStorage.setItem("excel_overwrite", overwrite ? "true" : "false");
    },

    /**
     * 更新默认项目ID
     * @param {string} projectId - 项目ID
     */
    async updateDefaultProjectId(projectId) {
      const oldProjectId = this.defaultProjectId;

      // 如果 projectId 没有变化，直接返回
      if (projectId === oldProjectId) {
        return;
      }

      // 切换项目时，校验 baseline key 在新项目中是否存在
      if (projectId && oldProjectId && projectId !== oldProjectId) {
        const baselineKey =
          this.excelBaselineKey || localStorage.getItem("excel_baseline_key");
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
                (r) => r.key_name === baselineKey.trim()
              );

            if (exists) {
              localStorage.setItem("excel_baseline_key", "");
              this.excelBaselineKey = "";
              ElMessage.warning(
                `Baseline key "${baselineKey.trim()}" already exists in project "${projectName}". It has been cleared. Please configure a new baseline key.`
              );
            }
          } catch (error) {
            debugError("[ExportStore] Failed to validate baseline key:", error);
            localStorage.setItem("excel_baseline_key", "");
            this.excelBaselineKey = "";
            ElMessage.warning(
              `Failed to validate baseline key uniqueness in project "${projectName}". The baseline key has been cleared for safety.`
            );
          }
        }
      }

      // 更新项目ID
      this.defaultProjectId = projectId || "";
      if (projectId) {
        localStorage.setItem("default_project_id", projectId);
      } else {
        localStorage.removeItem("default_project_id");
        // 如果没有项目ID，清空 baseline key
        if (this.excelBaselineKey) {
          await this.saveExcelBaselineKey("");
        }
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
            availableLanguages.some((availLang) => availLang.code === lang)
          )
        : [];

      // 确保至少选择一个语言
      if (validLanguages.length === 0) {
        debugLog(
          "[ExportStore] Cannot clear all languages, keeping at least one"
        );
        return false; // 返回 false 表示更新失败，需要至少选择一个
      }

      this.targetLanguages = validLanguages;
      localStorage.setItem(
        "target_languages",
        JSON.stringify(this.targetLanguages)
      );
      debugLog(
        "[ExportStore] Target languages saved to localStorage:",
        this.targetLanguages
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
     * 从localStorage加载设置
     */
    initializeTranslationSettings() {
      try {
        debugLog("[ExportStore] Initializing translation settings...");
        // 加载Excel基线键
        const excelBaselineKey = localStorage.getItem("excel_baseline_key");
        if (excelBaselineKey) {
          this.excelBaselineKey = excelBaselineKey;
          debugLog(
            "[ExportStore] Excel baseline key loaded:",
            excelBaselineKey
          );
        }

        // 加载Excel覆盖设置
        const excelOverwrite = localStorage.getItem("excel_overwrite");
        if (excelOverwrite !== null) {
          this.excelOverwrite = excelOverwrite === "true";
          debugLog(
            "[ExportStore] Excel overwrite setting loaded:",
            this.excelOverwrite
          );
        }

        // 加载默认项目ID
        const defaultProjectId = localStorage.getItem("default_project_id");
        if (defaultProjectId) {
          this.defaultProjectId = defaultProjectId;
          debugLog(
            "[ExportStore] Default project ID loaded from localStorage:",
            defaultProjectId
          );
        } else {
          debugLog(
            "[ExportStore] No default project ID in localStorage, trying to initialize from list"
          );
          // 如果没有保存的默认项目，尝试从项目列表中获取第一个项目
          this.initializeDefaultProjectFromList();
        }

        // 加载目标语言设置
        const targetLanguages = localStorage.getItem("target_languages");
        if (targetLanguages) {
          try {
            const parsedLanguages = JSON.parse(targetLanguages);
            // 验证语言代码是否有效（从配置文件验证）
            const availableLanguages = getAvailableLanguages();
            const validLanguages = parsedLanguages.filter((lang) =>
              availableLanguages.some((availLang) => availLang.code === lang)
            );
            // 确保至少选择一个语言，如果没有则使用默认值
            if (validLanguages.length === 0) {
              this.targetLanguages = ["Chinese", "Japanese"];
              localStorage.setItem(
                "target_languages",
                JSON.stringify(this.targetLanguages)
              );
              debugLog(
                "[ExportStore] No valid languages found, using default:",
                this.targetLanguages
              );
            } else {
              this.targetLanguages = validLanguages;
              debugLog(
                "[ExportStore] Target languages loaded from localStorage:",
                this.targetLanguages
              );
            }
          } catch (error) {
            debugError(
              "[ExportStore] Failed to parse target languages:",
              error
            );
            this.targetLanguages = ["Chinese", "Japanese"];
            localStorage.setItem(
              "target_languages",
              JSON.stringify(this.targetLanguages)
            );
          }
        } else {
          debugLog(
            "[ExportStore] No target languages in localStorage, using default: Chinese, Japanese"
          );
          this.targetLanguages = ["Chinese", "Japanese"];
          localStorage.setItem(
            "target_languages",
            JSON.stringify(this.targetLanguages)
          );
        }
      } catch (error) {
        debugError(
          "[ExportStore] Failed to initialize translation settings:",
          error
        );
      }
    },

    /**
     * 从项目列表中初始化默认项目（如果没有保存的选择）
     */
    initializeDefaultProjectFromList() {
      try {
        debugLog("[ExportStore] Initializing default project from list...");
        const projects = localStorage.getItem("lokalise_projects");
        if (projects) {
          const parsedProjects = JSON.parse(projects);
          debugLog(
            "[ExportStore] Found projects in localStorage:",
            parsedProjects
          );
          if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            // 默认选中第一个项目
            const firstProject = parsedProjects[0];
            if (firstProject && firstProject.project_id) {
              this.defaultProjectId = firstProject.project_id;
              localStorage.setItem(
                "default_project_id",
                firstProject.project_id
              );
              debugLog(
                "[ExportStore] Default project initialized to:",
                firstProject.project_id,
                firstProject.name
              );
            }
          } else {
            debugLog("[ExportStore] No valid projects found in parsed data");
          }
        } else {
          debugLog("[ExportStore] No projects found in localStorage");
        }
      } catch (error) {
        debugError(
          "[ExportStore] Failed to initialize default project from list:",
          error
        );
      }
    },

    /**
     * 重置翻译设置
     */
    resetTranslationSettings() {
      this.excelBaselineKey = "";
      this.excelOverwrite = false;
      this.defaultProjectId = "";
      this.targetLanguages = ["Chinese", "Japanese"]; // 重置为默认值

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 清空localStorage中的翻译设置
      localStorage.removeItem("excel_baseline_key");
      localStorage.removeItem("excel_overwrite");
      localStorage.removeItem("default_project_id");
      localStorage.removeItem("target_languages");
    },

    /**
     * 初始化导出设置到默认值
     * 用于缓存清除时重置设置
     * 清除所有导出相关的localStorage数据
     *
     * 注意：清除顺序很重要
     * 1. 先清除 localStorage（包括 Pinia persist 存储）
     * 2. 再重置状态，避免 Pinia persist 插件恢复旧数据
     */
    initializeToDefaults() {
      // 先清除localStorage中的导出相关数据（包括 Pinia persist 存储）
      // 必须在重置状态之前清除，避免 Pinia persist 插件恢复数据
      try {
        // 清除直接存储的导出数据
        localStorage.removeItem("excel_baseline_key");
        localStorage.removeItem("excel_overwrite");
        localStorage.removeItem("default_project_id");
        localStorage.removeItem("target_languages");
        // 清除Pinia persist存储（必须在重置状态之前）
        localStorage.removeItem("export-store");
        debugLog("[ExportStore] Cleared export settings from localStorage");
      } catch (error) {
        debugError(
          "[ExportStore] Failed to clear export settings from localStorage:",
          error
        );
      }

      // 重置状态（在清除 localStorage 之后）
      // 这样 Pinia persist 插件保存的将是空值
      this.excelBaselineKey = "";
      this.excelOverwrite = false;
      this.defaultProjectId = "";
      this.targetLanguages = ["Chinese", "Japanese"]; // 重置为默认值

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
