/**
 * 鼠标事件管理 Composable
 *
 * 负责处理单元格鼠标事件、选择、拖拽等交互
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.isSelecting - 是否正在选择
 * @param {Function} context.setSelection - 设置选择
 * @param {Function} context.updateSelectionEnd - 更新选区终点
 * @param {Function} context.isEditing - 判断是否正在编辑
 * @param {Function} context.stopEdit - 停止编辑
 * @param {Function} context.handleFillDragEnter - 处理填充拖拽进入
 * @param {Function} context.applyFill - 应用填充
 * @param {Function} context.stopColumnResize - 停止列宽调整
 * @param {Function} context.stopRowResize - 停止行高调整
 * @param {Function} context.handleColumnResize - 处理列宽调整
 * @param {Function} context.handleRowResize - 处理行高调整
 * @param {Object} context.props - 组件 props
 * @param {Object} context.fillHandleComposable - 填充手柄 composable
 * @param {Object} context.columnWidthComposable - 列宽管理 composable
 * @param {Object} context.rowHeightComposable - 行高管理 composable
 * @returns {Object} 返回鼠标事件处理方法
 */
export function useMouseEvents({
  isSelecting,
  setSelection,
  updateSelectionEnd,
  isEditing,
  stopEdit,
  handleFillDragEnter,
  applyFill,
  stopColumnResize,
  stopRowResize,
  handleColumnResize,
  handleRowResize,
  props,
  fillHandleComposable,
  columnWidthComposable,
  rowHeightComposable,
}) {
  /**
   * 处理鼠标抬起事件
   */
  const handleMouseUp = () => {
    isSelecting.value = false;
    if (props.enableFillHandle && fillHandleComposable?.isDraggingFill.value) {
      applyFill();
    }
    if (
      props.enableColumnResize &&
      columnWidthComposable?.isResizingColumn.value
    ) {
      stopColumnResize();
    }
    if (props.enableRowResize && rowHeightComposable?.isResizingRow.value) {
      stopRowResize();
    }
    window.removeEventListener("mouseup", handleMouseUp);
    if (props.enableColumnResize) {
      window.removeEventListener("mousemove", handleColumnResize);
    }
    if (props.enableRowResize) {
      window.removeEventListener("mousemove", handleRowResize);
    }
  };

  /**
   * 处理单元格鼠标按下事件
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {number} maxRows - 最大行数
   * @param {number} maxCols - 最大列数
   */
  const handleCellMouseDown = (row, col, maxRows, maxCols) => {
    // 边界检查
    if (row < 0 || row >= maxRows || col < 0 || col >= maxCols) {
      return;
    }

    if (isEditing(row, col)) {
      return;
    }

    if (stopEdit) {
      stopEdit(); // 切换焦点前保存旧的编辑
    }

    isSelecting.value = true;
    setSelection(row, col);
    window.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * 处理鼠标进入单元格事件
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const handleMouseEnter = (row, col) => {
    if (isSelecting.value) {
      updateSelectionEnd(row, col);
    } else if (
      props.enableFillHandle &&
      fillHandleComposable?.isDraggingFill.value
    ) {
      handleFillDragEnter(row, col);
    }
  };

  return {
    handleMouseUp,
    handleCellMouseDown,
    handleMouseEnter,
  };
}
