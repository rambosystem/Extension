import { ElMessage } from "element-plus";
import { useI18n } from "../Core/useI18n.js";
import { useStorage } from "../Core/useStorage.js";
import * as XLSX from "xlsx";

const { t } = useI18n();
const { getFromStorage, saveToStorage } = useStorage();

/**
 * Excel导出功能Hook
 */
export function useExcelExport() {
  /**
   * 生成自增序列key
   * @param {string} baselineKey - 基准key（如"key1"）
   * @param {number} index - 当前索引
   * @returns {string} 生成的key
   */
  const generateIncrementalKey = (baselineKey, index) => {
    // 提取基准key的字母部分和数字部分
    const match = baselineKey.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) {
      return baselineKey; // 如果格式不正确，返回原值
    }

    const [, prefix, numberStr] = match;
    const baseNumber = parseInt(numberStr, 10);
    const newNumber = baseNumber + index;

    return `${prefix}${newNumber}`;
  };

  /**
   * 将翻译结果转换为Excel格式
   * @param {Array} translationResult - 翻译结果数组
   * @returns {Array} Excel格式的数据数组
   */
  const formatToExcel = (translationResult) => {
    const header = ["key", "en", "zh_CN", "ja"];

    // 获取baseline key
    const baselineKey = getFromStorage("excel_baseline_key") || "";

    const excelData = [
      header,
      ...translationResult.map((row, index) => {
        // 根据baseline key是否为空决定key的生成方式
        let key;
        if (baselineKey && baselineKey.trim()) {
          // 如果baseline key不为空，使用自增序列
          key = generateIncrementalKey(baselineKey.trim(), index);
        } else {
          // 如果baseline key为空，使用en作为key
          key = row.en;
        }

        return [
          key,
          row.en, // en
          row.cn, // zh_CN (使用 cn 字段)
          row.jp, // ja
        ];
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
  const clearBaselineKey = () => {
    try {
      saveToStorage("excel_baseline_key", "");
      // console.log("Baseline key cleared after export");

      // 触发事件通知其他组件baseline key已被清空
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("baselineKeyCleared"));
      }
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
  };
}
