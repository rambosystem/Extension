import { ref } from "vue";

/**
 * 列宽管理 Composable
 *
 * 负责管理 Excel 组件的列宽功能，包括：
 * - 列宽状态管理
 * - 列宽拖拽调整
 * - 自适应列宽（手动触发）
 *
 * @param {Object} options - 配置选项
 * @param {number} options.defaultWidth - 默认列宽，默认 100
 * @param {number} options.minWidth - 最小列宽，默认 50
 * @param {number} options.maxWidth - 最大列宽，默认 500
 * @param {number} options.colsCount - 列数
 * @returns {Object} 返回列宽管理相关的方法和状态
 */
export function useColumnWidth({
  defaultWidth = 100,
  minWidth = 50,
  maxWidth = 500,
  colsCount = 10,
} = {}) {
  // 列宽状态
  const columnWidths = ref(new Map()); // Map<colIndex, width>
  const isResizingColumn = ref(false);
  const resizingColumnIndex = ref(null);
  const resizeStartX = ref(0);
  const resizeStartWidth = ref(0);

  /**
   * 获取列宽
   * @param {number} colIndex - 列索引
   * @returns {number} 列宽（像素）
   */
  const getColumnWidth = (colIndex) => {
    return columnWidths.value.get(colIndex) ?? defaultWidth;
  };

  /**
   * 计算单元格内容所需宽度
   * @param {string} text - 单元格文本
   * @returns {number} 计算后的宽度
   */
  const calculateCellWidth = (text) => {
    if (!text || typeof text !== "string") {
      return defaultWidth;
    }
    // 估算：每个字符约7-8px（13px字体），加上padding 12px
    const estimatedWidth = text.length * 8 + 12;
    return Math.max(minWidth, Math.min(maxWidth, estimatedWidth));
  };

  /**
   * 自适应列宽（根据列内容计算）
   * @param {number} colIndex - 列索引
   * @param {string[]} columns - 列标题数组
   * @param {string[][]} tableData - 表格数据
   * @param {number} rowsCount - 行数
   */
  const autoFitColumn = (colIndex, columns, tableData, rowsCount) => {
    if (colIndex < 0 || colIndex >= colsCount) {
      return;
    }

    let maxWidth = defaultWidth;

    // 检查header宽度
    if (columns && columns[colIndex]) {
      const headerText = columns[colIndex];
      maxWidth = Math.max(maxWidth, calculateCellWidth(headerText));
    }

    // 检查该列所有单元格的宽度
    if (tableData) {
      for (let r = 0; r < rowsCount; r++) {
        if (tableData[r] && tableData[r][colIndex] !== undefined) {
          const cellValue = String(tableData[r][colIndex] || "");
          const cellWidth = calculateCellWidth(cellValue);
          maxWidth = Math.max(maxWidth, cellWidth);
        }
      }
    }

    // 设置列宽，添加一些边距
    columnWidths.value.set(colIndex, maxWidth + 10);
  };

  /**
   * 开始调整列宽
   * @param {number} colIndex - 列索引
   * @param {MouseEvent} event - 鼠标事件
   */
  const startColumnResize = (colIndex, event) => {
    isResizingColumn.value = true;
    resizingColumnIndex.value = colIndex;
    resizeStartX.value = event.clientX;
    resizeStartWidth.value = getColumnWidth(colIndex);

    event.preventDefault();
  };

  /**
   * 处理列宽调整
   * @param {MouseEvent} event - 鼠标事件
   */
  const handleColumnResize = (event) => {
    if (!isResizingColumn.value || resizingColumnIndex.value === null) {
      return;
    }

    const deltaX = event.clientX - resizeStartX.value;
    const newWidth = Math.max(
      minWidth,
      Math.min(maxWidth, resizeStartWidth.value + deltaX)
    );

    columnWidths.value.set(resizingColumnIndex.value, newWidth);
  };

  /**
   * 停止调整列宽
   */
  const stopColumnResize = () => {
    isResizingColumn.value = false;
    resizingColumnIndex.value = null;
    resizeStartX.value = 0;
    resizeStartWidth.value = 0;
  };

  /**
   * 处理双击列边界自适应
   * @param {number} colIndex - 列索引
   * @param {string[]} columns - 列标题数组
   * @param {string[][]} tableData - 表格数据
   * @param {number} rowsCount - 行数
   */
  const handleDoubleClickResize = (colIndex, columns, tableData, rowsCount) => {
    autoFitColumn(colIndex, columns, tableData, rowsCount);
  };

  return {
    // 状态
    columnWidths,
    isResizingColumn,
    resizingColumnIndex,

    // 方法
    getColumnWidth,
    startColumnResize,
    handleColumnResize,
    stopColumnResize,
    handleDoubleClickResize,
    autoFitColumn,
  };
}
