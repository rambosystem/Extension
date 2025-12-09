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
 * @param {Object} options - 配置选项
 * @param {number} options.rowsCount - 行数，默认 15
 * @param {number} options.colsCount - 列数，默认 10
 * @param {string[][]} options.initialData - 初始数据，可选
 * @returns {Object} 返回数据和方法
 * @returns {import('vue').Ref<string[]>} returns.columns - 列标题数组
 * @returns {import('vue').Ref<number[]>} returns.rows - 行索引数组
 * @returns {import('vue').Ref<string[][]>} returns.tableData - 表格数据二维数组
 * @returns {Function} returns.getSmartValue - 智能填充值计算函数
 * @returns {Function} returns.generateClipboardText - 生成剪贴板文本
 * @returns {Function} returns.parsePasteData - 解析粘贴数据
 * @returns {Function} returns.setData - 设置表格数据
 * @returns {Function} returns.getData - 获取表格数据
 * @returns {Function} returns.updateCell - 更新单个单元格
 * @returns {Function} returns.clearData - 清空表格数据
 */
export function useExcelData({
  rowsCount = DEFAULT_CONFIG.ROWS_COUNT,
  colsCount = DEFAULT_CONFIG.COLS_COUNT,
  initialData = null,
} = {}) {
  // 根据实际数据动态计算行列数
  const calculateDimensions = (data, allowEmpty = false) => {
    // 处理无效数据或空数组
    if (!data || !Array.isArray(data) || data.length === 0) {
      return allowEmpty
        ? { rows: 0, cols: 0 }
        : { rows: rowsCount, cols: colsCount };
    }

    const actualRows = data.length;
    // 根据实际数据的列数计算，不使用默认 colsCount 作为最小值
    const rowLengths = data.map((row) => (Array.isArray(row) ? row.length : 0));
    const actualCols = Math.max(...rowLengths);

    return { rows: actualRows, cols: actualCols };
  };

  // 初始化时根据数据计算维度（初始化时允许空数组）
  const initialDimensions = calculateDimensions(initialData, true);
  const actualRowsCount = initialDimensions.rows;
  const actualColsCount = initialDimensions.cols;

  // 生成列标题（支持超过26列：A-Z, AA-AZ, BA-BZ...）
  const generateColumnLabel = (index) => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  // 基础数据生成（动态）
  const columns = ref(
    Array.from({ length: actualColsCount }, (_, i) => generateColumnLabel(i))
  );
  const rows = ref(Array.from({ length: actualRowsCount }, (_, i) => i));

  // 更新行列数
  const updateDimensions = (data) => {
    // setData 时允许空数组（保持空状态）
    const { rows: newRows, cols: newCols } = calculateDimensions(data, true);

    // 更新列
    if (newCols > columns.value.length) {
      const currentLength = columns.value.length;
      for (let i = currentLength; i < newCols; i++) {
        columns.value.push(generateColumnLabel(i));
      }
    } else if (newCols < columns.value.length) {
      columns.value = columns.value.slice(0, newCols);
    }

    // 更新行
    if (newRows > rows.value.length) {
      const currentLength = rows.value.length;
      for (let i = currentLength; i < newRows; i++) {
        rows.value.push(i);
      }
    } else if (newRows < rows.value.length) {
      rows.value = rows.value.slice(0, newRows);
    }
  };

  // 初始化表格数据
  const initializeTableData = () => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      // 使用初始数据，确保数据格式正确
      const data = initialData.map((row) => {
        if (Array.isArray(row)) {
          const rowData = [...row];
          // 确保每行的列数一致（补齐到最大列数）
          while (rowData.length < actualColsCount) {
            rowData.push("");
          }
          return rowData;
        }
        return Array.from({ length: actualColsCount }, () => "");
      });

      return data;
    }

    // 默认创建空表格
    return Array.from({ length: actualRowsCount }, () =>
      Array.from({ length: actualColsCount }, () => "")
    );
  };

  const tableData = ref(initializeTableData());

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

  /**
   * 设置表格数据
   * @param {string[][]} data - 新的表格数据
   */
  const setData = (data) => {
    if (!data || !Array.isArray(data)) {
      console.warn("setData: Invalid data format");
      return;
    }

    // 更新行列数（允许空数组）
    updateDimensions(data);

    // 处理空数组：如果数据为空，设置为空数组
    if (data.length === 0) {
      tableData.value = [];
      return;
    }

    // 确保数据格式正确
    const currentCols = columns.value.length;
    const normalizedData = data.map((row) => {
      if (Array.isArray(row)) {
        const rowData = [...row];
        // 补齐到当前列数
        while (rowData.length < currentCols) {
          rowData.push("");
        }
        return rowData;
      }
      return Array.from({ length: currentCols }, () => "");
    });

    tableData.value = normalizedData;
  };

  /**
   * 获取表格数据
   * @returns {string[][]} 表格数据的深拷贝
   */
  const getData = () => {
    return JSON.parse(JSON.stringify(tableData.value));
  };

  /**
   * 更新单个单元格
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {string} value - 新值
   */
  const updateCell = (row, col, value) => {
    const currentRows = rows.value.length;
    const currentCols = columns.value.length;

    // 如果超出范围，自动扩展
    if (row >= currentRows) {
      // 扩展行
      for (let i = currentRows; i <= row; i++) {
        rows.value.push(i);
        tableData.value.push(Array.from({ length: currentCols }, () => ""));
      }
    }

    if (col >= currentCols) {
      // 扩展列
      for (let i = currentCols; i <= col; i++) {
        columns.value.push(generateColumnLabel(i));
      }
      // 为所有行补齐列
      tableData.value.forEach((rowData) => {
        while (rowData.length <= col) {
          rowData.push("");
        }
      });
    }

    if (row < 0 || col < 0 || !tableData.value[row]) {
      console.warn(`updateCell: Invalid position row=${row}, col=${col}`);
      return;
    }

    tableData.value[row][col] = String(value ?? "");
  };

  /**
   * 清空表格数据
   */
  const clearData = () => {
    const currentRows = rows.value.length;
    const currentCols = columns.value.length;
    tableData.value = Array.from({ length: currentRows }, () =>
      Array.from({ length: currentCols }, () => "")
    );
  };

  return {
    columns,
    rows,
    tableData,
    getSmartValue,
    generateClipboardText,
    parsePasteData,
    setData,
    getData,
    updateCell,
    clearData,
  };
}
