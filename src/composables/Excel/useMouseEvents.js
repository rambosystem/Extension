/**
 * 鼠标事件管理 Composable
 *
 * 负责处理单元格鼠标事件、选择、拖拽等交互
 *
 * 模式说明：
 * - SINGLE 模式：普通选择（点击、拖选），只有一个选区
 * - MULTIPLE 模式：Ctrl+选择（点击、拖选），可以有多个选区
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.isSelecting - 是否正在选择
 * @param {import('vue').Ref} context.selectionStart - 选区起点
 * @param {import('vue').Ref} context.selectionEnd - 选区终点
 * @param {Function} context.startSingleSelection - SINGLE 模式：开始选择
 * @param {Function} context.updateSingleSelectionEnd - SINGLE 模式：更新选择终点
 * @param {Function} context.startMultipleSelection - MULTIPLE 模式：开始选择
 * @param {Function} context.updateMultipleSelectionEnd - MULTIPLE 模式：更新选择终点
 * @param {Function} context.endMultipleSelectionClick - MULTIPLE 模式：结束选择（单击）
 * @param {Function} context.endMultipleSelectionDrag - MULTIPLE 模式：结束选择（拖选）
 * @param {import('vue').Ref} context.multiSelections - 多选列表
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
  selectionStart,
  selectionEnd,
  startSingleSelection,
  updateSingleSelectionEnd,
  startMultipleSelection,
  updateMultipleSelectionEnd,
  endMultipleSelectionClick,
  endMultipleSelectionDrag,
  multiSelections,
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
  // MULTIPLE 模式状态跟踪
  let isMultipleMode = false; // 是否在 MULTIPLE 模式
  let multipleStartCell = null; // MULTIPLE 模式起始单元格
  let hasMultipleDragged = false; // MULTIPLE 模式是否发生了拖拽
  let multipleStartSelectionIndex = null; // MULTIPLE 模式起始单元格所在的选区索引（如果已在多选列表中）

  /**
   * 处理鼠标抬起事件
   * @param {MouseEvent} event - 鼠标事件对象
   */
  const handleMouseUp = (event) => {
    // MULTIPLE 模式：处理结束
    if (isSelecting.value && isMultipleMode && multipleStartCell) {
      // 确保 selectionEnd 已经更新（处理鼠标在最后一个单元格上抬起的情况）
      // 如果 selectionEnd 和 selectionStart 相同，说明是单击，否则是拖选
      const isClick =
        !hasMultipleDragged ||
        (selectionStart?.value &&
          selectionEnd?.value &&
          selectionStart.value.row === selectionEnd.value.row &&
          selectionStart.value.col === selectionEnd.value.col);

      // 检查是否拖拽回到了起始位置（取消操作）
      const isBackToStart =
        selectionEnd?.value &&
        selectionEnd.value.row === multipleStartCell.row &&
        selectionEnd.value.col === multipleStartCell.col;

      if (isClick || isBackToStart) {
        // MULTIPLE 模式：单击结束 或 拖拽回到起始位置
        // 现在 startMultipleSelection 不再立即添加单格选区，而是在 mouseup 时通过 endMultipleSelectionClick 添加
        // 所以总是需要调用 endMultipleSelectionClick 来处理
        if (endMultipleSelectionClick) {
          endMultipleSelectionClick(
            multipleStartCell.row,
            multipleStartCell.col
          );
        }
      } else if (
        hasMultipleDragged &&
        selectionStart?.value &&
        selectionEnd?.value
      ) {
        // MULTIPLE 模式：拖选结束（拖拽到了其他位置）
        if (endMultipleSelectionDrag) {
          // 如果起始单元格已在多选列表中，这是取消模式（移除拖选范围内的单元格）
          // 否则是添加模式（添加新选区）
          if (multipleStartSelectionIndex !== null) {
            endMultipleSelectionDrag({
              removeSelectionIndex: multipleStartSelectionIndex,
              isCancelMode: true, // 标记为取消模式
            });
          } else {
            endMultipleSelectionDrag({ removeSingleCell: multipleStartCell });
          }
        }
      }
    }
    // SINGLE 模式：不需要额外处理，selectionStart/selectionEnd 已经正确设置

    // 清理状态
    isSelecting.value = false;
    isMultipleMode = false;
    hasMultipleDragged = false;
    multipleStartCell = null;
    multipleStartSelectionIndex = null;

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
   * @param {MouseEvent} event - 鼠标事件对象（可选，用于检测 Ctrl 键）
   */
  const handleCellMouseDown = (row, col, maxRows, maxCols, event = null) => {
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

    // 检测 Ctrl 键（Windows/Linux）或 Meta 键（Mac）
    const isCtrlClick = event && (event.ctrlKey || event.metaKey);

    // 根据是否按 Ctrl 键选择不同的模式
    isMultipleMode = isCtrlClick;
    hasMultipleDragged = false; // 每次新的选择开始时重置
    multipleStartCell = isCtrlClick ? { row, col } : null;
    multipleStartSelectionIndex = null; // 每次新的选择开始时重置

    isSelecting.value = true;

    if (isCtrlClick) {
      // MULTIPLE 模式：开始选择
      if (startMultipleSelection) {
        const result = startMultipleSelection(row, col);
        // 如果返回了选区索引，说明起始单元格已在多选列表中
        if (result && result.containingSelectionIndex !== undefined) {
          multipleStartSelectionIndex = result.containingSelectionIndex;
        }
      }
    } else {
      // SINGLE 模式：开始选择
      if (startSingleSelection) {
        startSingleSelection(row, col);
      }
    }

    // 直接注册 handleMouseUp，本身就接收事件对象
    window.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * 处理鼠标进入单元格事件
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const handleMouseEnter = (row, col) => {
    if (isSelecting.value) {
      if (isMultipleMode) {
        // MULTIPLE 模式：检查是否发生了拖拽
        // 只要鼠标移动到了不同的单元格，就认为发生了拖拽
        if (
          multipleStartCell &&
          (row !== multipleStartCell.row || col !== multipleStartCell.col)
        ) {
          hasMultipleDragged = true;
        }

        // MULTIPLE 模式：更新选择终点（确保最后一个单元格也被正确更新）
        if (updateMultipleSelectionEnd) {
          updateMultipleSelectionEnd(row, col);
        }
      } else {
        // SINGLE 模式：更新选择终点
        if (updateSingleSelectionEnd) {
          updateSingleSelectionEnd(row, col);
        }
      }
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
