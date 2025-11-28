import { ref } from "vue";

/**
 * 行高管理 Composable
 *
 * 负责管理 Excel 组件的行高功能，包括：
 * - 行高状态管理
 * - 行高拖拽调整
 * - 自适应行高（手动触发）
 *
 * @param {Object} options - 配置选项
 * @param {number} options.defaultHeight - 默认行高，默认 28
 * @param {number} options.minHeight - 最小行高，默认 20
 * @param {number} options.maxHeight - 最大行高，默认 200
 * @param {number} options.rowsCount - 行数
 * @returns {Object} 返回行高管理相关的方法和状态
 */
export function useRowHeight({
  defaultHeight = 28,
  minHeight = 20,
  maxHeight = 200,
  rowsCount = 15,
} = {}) {
  // 行高状态
  const rowHeights = ref(new Map()); // Map<rowIndex, height>
  const isResizingRow = ref(false);
  const resizingRowIndex = ref(null);
  const resizeStartY = ref(0);
  const resizeStartHeight = ref(0);

  /**
   * 获取行高
   * @param {number} rowIndex - 行索引
   * @returns {number} 行高（像素）
   */
  const getRowHeight = (rowIndex) => {
    return rowHeights.value.get(rowIndex) ?? defaultHeight;
  };

  /**
   * 计算文本真实显示宽度（区分全角和半角字符）
   * @param {string} text - 文本内容
   * @returns {number} 文本宽度（像素）
   */
  const getTextDisplayWidth = (text) => {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // ASCII 字符 (英文/数字) 算 8.5px，其他 (汉字等) 算 13.5px
      width += code < 256 ? 8.5 : 13.5;
    }
    return width;
  };

  /**
   * 计算单元格内容所需高度
   * @param {string} text - 单元格文本
   * @param {number} columnWidth - 列宽（像素）
   * @param {number} baseHeight - 基础高度
   * @returns {number} 计算后的高度
   */
  const calculateCellHeight = (
    text,
    columnWidth,
    baseHeight = defaultHeight
  ) => {
    if (!text || typeof text !== "string") {
      return baseHeight;
    }

    // 基础样式参数 (需与 CSS 保持一致)
    const paddingH = 13; // 左右 padding (6+6) + border/buffer (1)
    const fontSize = 13;
    const lineHeightRatio = 1.4; // CSS line-height
    const lineHeightPx = fontSize * lineHeightRatio; // ~18.2px

    // 计算文本内容的真实宽度
    const textWidth = getTextDisplayWidth(text);
    const availableWidth = columnWidth - paddingH;

    // 如果列宽足够，单行显示
    if (textWidth <= availableWidth) {
      return baseHeight;
    }

    // 列宽不够，计算需要折多少行
    const lineContentWidth = availableWidth - 2; // 保守计算减去一点右侧 buffer
    const linesNeeded =
      Math.ceil(textWidth / Math.max(lineContentWidth, 1)) || 1;

    // 计算所需高度 (行数 * 行高 + 上下 padding 4px)
    const requiredHeight = linesNeeded * lineHeightPx + 4;

    return Math.max(minHeight, Math.min(maxHeight, requiredHeight));
  };

  /**
   * 自适应行高（根据行内容计算）
   * @param {number} rowIndex - 行索引
   * @param {string[][]} tableData - 表格数据
   * @param {number} colsCount - 列数
   * @param {Function} getColumnWidth - 获取列宽的函数 (colIndex) => number
   */
  const autoFitRow = (rowIndex, tableData, colsCount, getColumnWidth) => {
    if (rowIndex < 0 || rowIndex >= rowsCount) {
      return;
    }

    let maxHeight = defaultHeight;

    // 检查该行所有单元格的高度
    if (tableData && tableData[rowIndex]) {
      for (let c = 0; c < colsCount; c++) {
        if (tableData[rowIndex][c] !== undefined) {
          const cellValue = String(tableData[rowIndex][c] || "");
          // 获取当前列的实际宽度
          const columnWidth = getColumnWidth ? getColumnWidth(c) : 100; // 默认100px
          const cellHeight = calculateCellHeight(cellValue, columnWidth);
          maxHeight = Math.max(maxHeight, cellHeight);
        }
      }
    }

    // 设置行高，添加一些边距
    rowHeights.value.set(rowIndex, maxHeight + 4);
  };

  /**
   * 开始调整行高
   * @param {number} rowIndex - 行索引
   * @param {MouseEvent} event - 鼠标事件
   */
  const startRowResize = (rowIndex, event) => {
    isResizingRow.value = true;
    resizingRowIndex.value = rowIndex;
    resizeStartY.value = event.clientY;
    resizeStartHeight.value = getRowHeight(rowIndex);

    event.preventDefault();
  };

  /**
   * 处理行高调整
   * @param {MouseEvent} event - 鼠标事件
   */
  const handleRowResize = (event) => {
    if (!isResizingRow.value || resizingRowIndex.value === null) {
      return;
    }

    const deltaY = event.clientY - resizeStartY.value;
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, resizeStartHeight.value + deltaY)
    );

    rowHeights.value.set(resizingRowIndex.value, newHeight);
  };

  /**
   * 停止调整行高
   */
  const stopRowResize = () => {
    isResizingRow.value = false;
    resizingRowIndex.value = null;
    resizeStartY.value = 0;
    resizeStartHeight.value = 0;
  };

  /**
   * 处理双击行边界自适应
   * @param {number} rowIndex - 行索引
   * @param {string[][]} tableData - 表格数据
   * @param {number} colsCount - 列数
   * @param {Function} getColumnWidth - 获取列宽的函数 (colIndex) => number
   */
  const handleDoubleClickResize = (
    rowIndex,
    tableData,
    colsCount,
    getColumnWidth
  ) => {
    autoFitRow(rowIndex, tableData, colsCount, getColumnWidth);
  };

  return {
    // 状态
    rowHeights,
    isResizingRow,
    resizingRowIndex,

    // 方法
    getRowHeight,
    startRowResize,
    handleRowResize,
    stopRowResize,
    handleDoubleClickResize,
    autoFitRow,
  };
}
