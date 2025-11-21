import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useExcelExport } from "../../composables/Excel/useExcelExport.js";
import { useI18n } from "../../composables/Core/useI18n.js";
import { debugLog, debugError } from "../../utils/debug.js";

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
      if (translationResult.length === 0) {
        ElMessage.warning("No translation data to export");
        return;
      }

      const excelExport = useExcelExport();
      excelExport.exportExcel(translationResult);
    },

    /**
     * 保存Excel基线键
     * @param {string} key - 基线键
     */
    saveExcelBaselineKey(key) {
      const { t } = useI18n();

      if (!key?.trim()) {
        // 清空操作
        localStorage.setItem("excel_baseline_key", "");
        this.excelBaselineKey = "";
        return true;
      }

      // 验证格式：key+数字
      if (!key.match(/^[a-zA-Z]+[0-9]+$/)) {
        ElMessage.warning(t("translationSetting.exportBaselineKeySaveWarning"));
        return false;
      }

      localStorage.setItem("excel_baseline_key", key.trim());
      this.excelBaselineKey = key.trim();
      ElMessage.success(t("translationSetting.exportBaselineKeySaveSuccess"));
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
    updateDefaultProjectId(projectId) {
      debugLog("[ExportStore] Updating default project ID:", projectId);
      this.defaultProjectId = projectId || "";
      if (projectId) {
        localStorage.setItem("default_project_id", projectId);
        debugLog("[ExportStore] Default project ID saved to localStorage");
      } else {
        localStorage.removeItem("default_project_id");
        debugLog("[ExportStore] Default project ID removed from localStorage");
      }
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

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 清空localStorage中的翻译设置
      localStorage.removeItem("excel_baseline_key");
      localStorage.removeItem("excel_overwrite");
      localStorage.removeItem("default_project_id");
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
