import { ElMessage } from "element-plus";

/**
 * CSV导出功能Hook
 */
export function useCSVExport() {
  /**
   * 将翻译结果转换为CSV格式
   * @param {Array} translationResult - 翻译结果数组
   * @returns {string} CSV格式的字符串
   */
  const formatToCSV = (translationResult) => {
    const header = ["key", "en", "zh_CN", "jp"];
    const csvContent = [
      header.join(","),
      ...translationResult.map((row) =>
        [
          row.en, // key == en
          row.en, // en
          row.cn, // zh_CN (使用 cn 字段)
          row.jp, // jp
        ].map((value) => `"${value.replace(/"/g, '""')}"`)
      ), // 正确处理引号转义
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
   * 导出翻译结果为CSV文件
   * @param {Array} translationResult - 翻译结果数组
   */
  const exportCSV = (translationResult) => {
    if (!translationResult || translationResult.length === 0) {
      ElMessage.warning("No translation data to export");
      return;
    }

    try {
      const csvContent = formatToCSV(translationResult);
      downloadCSV(csvContent);
      ElMessage.success("CSV file downloaded successfully");
    } catch (error) {
      console.error("CSV export failed:", error);
      ElMessage.error("Failed to export CSV file");
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
      ElMessage.error("Failed to open Lokalise upload page");
    }
  };

  return {
    formatToCSV,
    downloadCSV,
    exportCSV,
    exportCSVAndUpload,
    getLokaliseUploadUrl,
  };
}
