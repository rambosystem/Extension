import { ref, computed } from "vue";

/**
 * Excel 选择逻辑 Composable
 *
 * 用于通用组件 Excel 的内部状态管理
 *
 * 设计原则：
 * - 通用组件（Components/Common/）应该自包含，不依赖 Store
 * - 每个组件实例拥有独立的选择状态，保证组件的可复用性
 * - 这是通用组件的标准做法，符合组件化设计原则
 */
export function useSelection() {
  const activeCell = ref(null); // { row, col }
  const selectionStart = ref(null);
  const selectionEnd = ref(null);
  const isSelecting = ref(false);

  // 计算归一化后的选区（始终确保 min <= max）
  const normalizedSelection = computed(() => {
    if (!selectionStart.value || !selectionEnd.value) return null;
    return {
      minRow: Math.min(selectionStart.value.row, selectionEnd.value.row),
      maxRow: Math.max(selectionStart.value.row, selectionEnd.value.row),
      minCol: Math.min(selectionStart.value.col, selectionEnd.value.col),
      maxCol: Math.max(selectionStart.value.col, selectionEnd.value.col),
    };
  });

  const setSelection = (row, col) => {
    activeCell.value = { row, col };
    selectionStart.value = { row, col };
    selectionEnd.value = { row, col };
  };

  const updateSelectionEnd = (row, col) => {
    selectionEnd.value = { row, col };
  };

  const isActive = (row, col) => {
    return activeCell.value?.row === row && activeCell.value?.col === col;
  };

  const isInSelection = (row, col) => {
    const range = normalizedSelection.value;
    if (!range) return false;
    return (
      row >= range.minRow &&
      row <= range.maxRow &&
      col >= range.minCol &&
      col <= range.maxCol
    );
  };

  const isInSelectionHeader = (index, type) => {
    const range = normalizedSelection.value;
    if (!range) return false;
    return type === "row"
      ? index >= range.minRow && index <= range.maxRow
      : index >= range.minCol && index <= range.maxCol;
  };

  // 移动活动单元格（用于键盘导航）
  const moveActiveCell = (
    rOffset,
    cOffset,
    maxRows,
    maxCols,
    extendSelection = false
  ) => {
    if (!activeCell.value) return;

    const currentRow = extendSelection
      ? selectionEnd.value.row
      : activeCell.value.row;
    const currentCol = extendSelection
      ? selectionEnd.value.col
      : activeCell.value.col;

    const newRow = Math.max(0, Math.min(maxRows - 1, currentRow + rOffset));
    const newCol = Math.max(0, Math.min(maxCols - 1, currentCol + cOffset));
    const newPos = { row: newRow, col: newCol };

    if (extendSelection) {
      // Shift + 方向键：只更新终点
      selectionEnd.value = newPos;
    } else {
      // 普通移动：重置起点和终点
      activeCell.value = newPos;
      selectionStart.value = newPos;
      selectionEnd.value = newPos;
    }
  };

  return {
    activeCell,
    selectionStart,
    selectionEnd,
    isSelecting,
    normalizedSelection,
    setSelection,
    updateSelectionEnd,
    isActive,
    isInSelection,
    isInSelectionHeader,
    moveActiveCell,
  };
}
