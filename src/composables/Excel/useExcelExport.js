import { ElMessage } from "element-plus";
import { useI18n } from "../Core/useI18n.js";
import { useExportStore } from "../../stores/translation/export.js";
import {
  getAvailableLanguages,
  getLanguageIso,
} from "../../config/languages.js";
import * as XLSX from "xlsx";

const { t } = useI18n();

/**
 * Excel导出功能Hook
 */
export function useExcelExport() {
  const exportStore = useExportStore();

  /**
   * 将翻译结果转换为Excel格式
   * @param {Array} translationResult - 翻译结果数组
   * @returns {Array} Excel格式的数据数组
   */
  const formatToExcel = (translationResult) => {
    // 获取选中的目标语言（从 localStorage 获取，与翻译逻辑保持一致）
    let targetLanguages = [];
    try {
      targetLanguages = JSON.parse(
        localStorage.getItem("target_languages") || "[]"
      );
    } catch (error) {
      console.error("Failed to parse target languages:", error);
    }
    const availableLanguages = getAvailableLanguages();
    const sortedLanguages = availableLanguages.filter((availLang) =>
      targetLanguages.includes(availLang.code)
    );

    // 构建表头：key, en, 然后是目标语言的ISO代码
    const header = ["key", "en", ...sortedLanguages.map((lang) => lang.iso)];

    const excelData = [
      header,
      ...translationResult.map((row) => {
        // 直接使用翻译结果中已有的key，如果没有则使用en作为fallback
        // key的生成由Excel组件的auto increment功能处理，导出时使用已有的key
        const key = row.key && row.key.trim() ? row.key.trim() : row.en || "";

        // 构建数据行：key, en, 然后是目标语言的翻译
        const rowData = [key, row.en];
        sortedLanguages.forEach((lang) => {
          const prop = lang.code.toLowerCase().replace(/\s+/g, "_");
          rowData.push(row[prop] || "");
        });

        return rowData;
      }),
    ];

    return excelData;
  };

  /**
   * 下载Excel文件
   * @param {Array} excelData - Excel数据
   * @param {string} filename - 文件名，默认为 'translation_result.xlsx'
   */
  const downloadExcel = (excelData, filename = "translation_result.xlsx") => {
    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, "Translations");

    // 生成Excel文件并下载
    XLSX.writeFile(wb, filename);
  };

  /**
   * 清空baseline key
   */
  const clearBaselineKey = async () => {
    try {
      // 使用 store 的方法清空 baseline key
      await exportStore.saveExcelBaselineKey("");
    } catch (error) {
      console.error("Failed to clear baseline key:", error);
    }
  };

  /**
   * 导出翻译结果为Excel文件
   * @param {Array} translationResult - 翻译结果数组
   */
  const exportExcel = (translationResult) => {
    if (!translationResult || translationResult.length === 0) {
      ElMessage.warning(t("translation.noTranslationData"));
      return;
    }

    try {
      const excelData = formatToExcel(translationResult);
      downloadExcel(excelData);
      ElMessage.success(
        t("excelExport.excelDownloaded") || "Excel file downloaded successfully"
      );

      // 导出完成后清空baseline key
      clearBaselineKey();
    } catch (error) {
      console.error("Excel export failed:", error);
      ElMessage.error(
        t("excelExport.excelExportFailed") || "Excel export failed"
      );
    }
  };

  return {
    formatToExcel,
    downloadExcel,
    exportExcel,
    clearBaselineKey,
  };
}
