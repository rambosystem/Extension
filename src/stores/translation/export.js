import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useExcelExport } from "../../composables/Excel/useExcelExport.js";

/**
 * 导出功能状态管理
 * 管理Excel导出设置和相关功能
 */
export const useExportStore = defineStore("export", {
  state: () => ({
    // Excel 导出设置
    excelBaselineKey: "",
    excelOverwrite: false,

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
      if (!key?.trim()) {
        // 清空操作
        localStorage.setItem("excel_baseline_key", "");
        this.excelBaselineKey = "";
        return true;
      }

      // 验证格式：key+数字
      if (!key.match(/^[a-zA-Z]+[0-9]+$/)) {
        ElMessage.warning(
          "Excel baseline key format should be: letters + numbers (e.g., key123)"
        );
        return false;
      }

      localStorage.setItem("excel_baseline_key", key.trim());
      this.excelBaselineKey = key.trim();
      ElMessage.success("Excel baseline key saved successfully");
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
     * 初始化导出设置
     * 从localStorage加载设置
     */
    initializeExportSettings() {
      try {
        // 加载Excel基线键
        const excelBaselineKey = localStorage.getItem("excel_baseline_key");
        if (excelBaselineKey) {
          this.excelBaselineKey = excelBaselineKey;
        }

        // 加载Excel覆盖设置
        const excelOverwrite = localStorage.getItem("excel_overwrite");
        if (excelOverwrite !== null) {
          this.excelOverwrite = excelOverwrite === "true";
        }
      } catch (error) {
        console.error("Failed to initialize export settings:", error);
      }
    },

    /**
     * 重置导出设置
     */
    resetExportSettings() {
      this.excelBaselineKey = "";
      this.excelOverwrite = false;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 清空localStorage中的导出设置
      localStorage.removeItem("excel_baseline_key");
      localStorage.removeItem("excel_overwrite");
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
