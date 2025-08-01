import { ElMessage } from "element-plus";
import { useI18n } from "./useI18n.js";
import { useStorage } from "./useStorage.js";

const { t } = useI18n();
const { getFromStorage, saveToStorage } = useStorage();

/**
 * CSV导出功能Hook
 */
export function useCSVExport() {
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
   * 将翻译结果转换为CSV格式
   * @param {Array} translationResult - 翻译结果数组
   * @returns {string} CSV格式的字符串
   */
  const formatToCSV = (translationResult) => {
    const header = ["key", "en", "zh_CN", "jp"];
    
    // 获取baseline key
    const baselineKey = getFromStorage("csv_baseline_key") || "";
    
    const csvContent = [
      header.join(","),
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
          row.jp, // jp
        ].map((value) => `"${value.replace(/"/g, '""')}"`);
      }), // 正确处理引号转义
    ].join("\n");

    return csvContent;
  };

  /**
   * 下载CSV文件
   * @param {string} csvContent - CSV内容
   * @param {string} filename - 文件名，默认为 'translation_result.csv'
   */
  const downloadCSV = (csvContent, filename = "translation_result.csv") => {
    // 添加 UTF-8 BOM 来解决中文乱码问题
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 清空baseline key
   */
  const clearBaselineKey = () => {
    try {
      saveToStorage("csv_baseline_key", "");
      // console.log("Baseline key cleared after export");
      
      // 触发事件通知其他组件baseline key已被清空
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('baselineKeyCleared'));
      }
    } catch (error) {
      console.error("Failed to clear baseline key:", error);
    }
  };

  /**
   * 导出翻译结果为CSV文件
   * @param {Array} translationResult - 翻译结果数组
   */
  const exportCSV = (translationResult) => {
    if (!translationResult || translationResult.length === 0) {
      ElMessage.warning(t("translation.noTranslationData"));
      return;
    }

    try {
      const csvContent = formatToCSV(translationResult);
      downloadCSV(csvContent);
      ElMessage.success(t("csvExport.csvDownloaded"));
      
      // 导出完成后清空baseline key
      clearBaselineKey();
    } catch (error) {
      console.error("CSV export failed:", error);
      ElMessage.error(t("csvExport.csvExportFailed"));
    }
  };

  /**
   * 获取Lokalise上传URL
   * @returns {string|null} 上传URL或null
   */
  const getLokaliseUploadUrl = () => {
    const uploadUrl = localStorage.getItem("lokalise_upload_url");
    return uploadUrl?.trim() || null;
  };

  /**
   * 导出CSV并打开Lokalise上传页面
   * @param {Array} translationResult - 翻译结果数组
   */
  const exportCSVAndUpload = (translationResult) => {
    // 先检查是否配置了上传URL
    const uploadUrl = getLokaliseUploadUrl();

    if (!uploadUrl) {
      ElMessage.warning(
        "Upload URL is not configured, please configure Lokalise Project Upload URL in Settings first"
      );
      return;
    }

    // 导出CSV
    exportCSV(translationResult);

    // 然后打开Lokalise上传页面
    try {
      window.open(uploadUrl, "_blank");
    } catch (error) {
      console.error("Failed to open upload URL:", error);
      ElMessage.error(t("csvExport.lokaliseUploadFailed"));
    }
    
    // 确保导出完成后清空baseline key（即使exportCSV已经清空，这里作为双重保险）
    clearBaselineKey();
  };

  return {
    formatToCSV,
    downloadCSV,
    exportCSV,
    exportCSVAndUpload,
    getLokaliseUploadUrl,
  };
}
