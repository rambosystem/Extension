import { ref } from "vue";

/**
 * 智能填充管理 Composable
 *
 * 负责管理 Excel 组件的智能填充功能，包括：
 * - 填充手柄显示逻辑
 * - 拖拽填充操作
 * - 智能值计算（数字递增、末尾数字递增等）
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.getSmartValue - 智能值计算函数
 * @param {Function} options.saveHistory - 保存历史记录函数
 * @returns {Object} 返回智能填充相关的方法和状态
 */
export function useFillHandle({ getSmartValue, saveHistory }) {
  // 填充状态
  const isDraggingFill = ref(false);
  const dragStartCell = ref(null);
  const dragEndCell = ref(null);

  /**
   * 判断是否应该显示填充手柄
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {Object} normalizedSelection - 归一化选区
   * @returns {boolean} 是否显示填充手柄
   */
  const shouldShowHandle = (row, col, normalizedSelection) => {
    if (!normalizedSelection) return false;
    return (
      row === normalizedSelection.maxRow && col === normalizedSelection.maxCol
    );
  };

  /**
   * 开始填充拖拽
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {Object} normalizedSelection - 归一化选区
   * @param {Function} onMouseUp - 鼠标抬起事件处理函数
   */
  const startFillDrag = (row, col, normalizedSelection, onMouseUp) => {
    if (!normalizedSelection) return;
    isDraggingFill.value = true;
    dragStartCell.value = { row: normalizedSelection.maxRow, col }; // 从选区底部开始
    dragEndCell.value = { row, col };
    window.addEventListener("mouseup", onMouseUp);
  };

  /**
   * 处理填充拖拽进入
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const handleFillDragEnter = (row, col) => {
    if (!dragStartCell.value) return;
    if (col === dragStartCell.value.col && row >= dragStartCell.value.row) {
      dragEndCell.value = { row, col };
    }
  };

  /**
   * 判断单元格是否在拖拽填充区域内
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean} 是否在拖拽填充区域内
   */
  const isInDragArea = (row, col) => {
    if (!isDraggingFill.value || !dragStartCell.value || !dragEndCell.value)
      return false;
    return (
      col === dragStartCell.value.col &&
      row > dragStartCell.value.row &&
      row <= dragEndCell.value.row
    );
  };

  /**
   * 应用填充操作
   * @param {string[][]} tableData - 表格数据
   * @param {number} maxRows - 最大行数
   * @param {number} maxCols - 最大列数
   */
  const applyFill = (tableData, maxRows, maxCols) => {
    if (!isDraggingFill.value || !dragStartCell.value || !dragEndCell.value) {
      return;
    }

    const start = dragStartCell.value;
    const end = dragEndCell.value;

    if (end.row > start.row) {
      saveHistory(tableData); // 填充前保存
      const colIndex = start.col;

      // 边界检查
      if (colIndex < 0 || colIndex >= maxCols) {
        console.warn(`Invalid column index: ${colIndex}`);
        return;
      }

      const baseValue = tableData[start.row]?.[start.col] ?? "";
      for (let r = start.row + 1; r <= end.row; r++) {
        if (r >= 0 && r < maxRows) {
          tableData[r][colIndex] = getSmartValue(baseValue, r - start.row);
        }
      }
    }

    // 清理状态
    isDraggingFill.value = false;
    dragStartCell.value = null;
    dragEndCell.value = null;
  };

  /**
   * 清理填充状态
   */
  const cleanup = () => {
    isDraggingFill.value = false;
    dragStartCell.value = null;
    dragEndCell.value = null;
  };

  return {
    // 状态
    isDraggingFill,
    dragStartCell,
    dragEndCell,

    // 方法
    shouldShowHandle,
    startFillDrag,
    handleFillDragEnter,
    isInDragArea,
    applyFill,
    cleanup,
  };
}
