import { ElMessage } from "element-plus";
// @ts-ignore - JS module without type declarations
import { t } from "../../../utils/i18n.js";
// @ts-ignore - JS module without type declarations
import { useExportStore } from "../../stores/translation/export.js";
// @ts-ignore - JS module without type declarations
import { getAvailableLanguages } from "../../config/languages.js";
import * as XLSX from "xlsx";

/**
 * 语言配置对象
 */
interface LanguageConfig {
  code: string;
  name: string;
  iso: string;
}

/**
 * 翻译结果行数据
 */
interface TranslationResultRow {
  key?: string;
  en?: string;
  [key: string]: any;
}

/**
 * useExcelExport 返回值
 */
export interface UseExcelExportReturn {
  formatToExcel: (translationResult: TranslationResultRow[]) => string[][];
  downloadExcel: (excelData: string[][], filename?: string) => void;
  exportExcel: (translationResult: TranslationResultRow[]) => void;
  clearBaselineKey: () => Promise<void>;
}

/**
 * Excel导出功能Hook
 */
export function useExcelExport(): UseExcelExportReturn {
  const exportStore = useExportStore();

  /**
   * 将翻译结果转换为Excel格式
   */
  const formatToExcel = (
    translationResult: TranslationResultRow[]
  ): string[][] => {
    let targetLanguages: string[] = [];
    try {
      targetLanguages = JSON.parse(
        localStorage.getItem("target_languages") || "[]"
      );
    } catch (error) {
      console.error("Failed to parse target languages:", error);
    }
    const availableLanguages = getAvailableLanguages() as LanguageConfig[];
    const sortedLanguages = availableLanguages.filter(
      (availLang: LanguageConfig) => targetLanguages.includes(availLang.code)
    );

    const header = [
      "key",
      "en",
      ...sortedLanguages.map((lang: LanguageConfig) => lang.iso),
    ];

    const excelData: string[][] = [
      header,
      ...translationResult.map((row) => {
        const key = row.key && row.key.trim() ? row.key.trim() : row.en || "";

        const rowData: string[] = [key, row.en || ""];
        sortedLanguages.forEach((lang: LanguageConfig) => {
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
   */
  const downloadExcel = (
    excelData: string[][],
    filename = "translation_result.xlsx"
  ): void => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Translations");
    XLSX.writeFile(wb, filename);
  };

  /**
   * 清空baseline key
   */
  const clearBaselineKey = async (): Promise<void> => {
    try {
      await exportStore.saveExcelBaselineKey("");
    } catch (error) {
      console.error("Failed to clear baseline key:", error);
    }
  };

  /**
   * 导出翻译结果为Excel文件
   */
  const exportExcel = (translationResult: TranslationResultRow[]): void => {
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
