import { ref } from "vue";
import { DEFAULT_CONFIG, CLIPBOARD_SEPARATORS } from "./constants.js";

/**
 * Excel 数据管理 Composable
 *
 * 用于通用组件 Excel 的内部状态管理
 *
 * 设计原则：
 * - 通用组件（Components/Common/）应该自包含，不依赖 Store
 * - 每个组件实例拥有独立的状态，保证组件的可复用性
 * - 这是通用组件的标准做法，符合组件化设计原则
 *
 * @param {number} rowsCount - 行数，默认 15
 * @param {number} colsCount - 列数，默认 10
 * @returns {Object} 返回数据和方法
 * @returns {import('vue').Ref<string[]>} returns.columns - 列标题数组
 * @returns {import('vue').Ref<number[]>} returns.rows - 行索引数组
 * @returns {import('vue').Ref<string[][]>} returns.tableData - 表格数据二维数组
 * @returns {Function} returns.getSmartValue - 智能填充值计算函数
 * @returns {Function} returns.generateClipboardText - 生成剪贴板文本
 * @returns {Function} returns.parsePasteData - 解析粘贴数据
 */
export function useExcelData(
  rowsCount = DEFAULT_CONFIG.ROWS_COUNT,
  colsCount = DEFAULT_CONFIG.COLS_COUNT
) {
  // 基础数据生成
  const columns = ref(
    Array.from({ length: colsCount }, (_, i) => String.fromCharCode(65 + i))
  );
  const rows = ref(Array.from({ length: rowsCount }, (_, i) => i));
  const tableData = ref(
    Array.from({ length: rowsCount }, () =>
      Array.from({ length: colsCount }, () => "")
    )
  );

  /**
   * 智能填充算法
   * 支持数字递增和末尾数字递增（如 "Item1" -> "Item2"）
   *
   * @param {string} value - 原始值
   * @param {number} step - 递增步长
   * @returns {string} 填充后的值
   */
  const getSmartValue = (value, step) => {
    if (!value || typeof value !== "string") return "";

    const trimmed = value.trim();
    if (!trimmed) return "";

    // 纯数字：直接递增
    if (!isNaN(trimmed) && trimmed !== "") {
      return String(Number(trimmed) + step);
    }

    // 末尾数字模式：如 "Item1" -> "Item2"
    const match = trimmed.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2], 10);
      return `${prefix}${number + step}`;
    }

    // 其他情况：返回原值
    return value;
  };

  /**
   * 生成剪贴板文本
   * 将选中的单元格数据转换为制表符分隔的文本格式
   *
   * @param {Object} range - 选区范围 { minRow, maxRow, minCol, maxCol }
   * @param {string[][]} data - 表格数据
   * @returns {string} 剪贴板文本
   */
  const generateClipboardText = (range, data) => {
    if (!range || !data) return "";

    const rowsData = [];
    for (let r = range.minRow; r <= range.maxRow; r++) {
      if (!data[r]) continue; // 边界检查

      const rowData = [];
      for (let c = range.minCol; c <= range.maxCol; c++) {
        const cellValue = data[r][c] ?? ""; // 安全的数组访问
        rowData.push(cellValue);
      }
      rowsData.push(rowData.join(CLIPBOARD_SEPARATORS.CELL));
    }
    return rowsData.join(CLIPBOARD_SEPARATORS.ROW);
  };

  /**
   * 解析粘贴数据
   * 将剪贴板文本转换为二维数组
   *
   * @param {string} clipboardText - 剪贴板文本
   * @returns {string[][]} 解析后的数据数组
   */
  const parsePasteData = (clipboardText) => {
    if (!clipboardText || typeof clipboardText !== "string") {
      return [];
    }

    try {
      return clipboardText
        .split(CLIPBOARD_SEPARATORS.LINE_BREAK)
        .filter((row) => row !== "")
        .map((row) => row.split(CLIPBOARD_SEPARATORS.CELL));
    } catch (error) {
      console.warn("Failed to parse paste data:", error);
      return [];
    }
  };

  return {
    columns,
    rows,
    tableData,
    getSmartValue,
    generateClipboardText,
    parsePasteData,
  };
}
