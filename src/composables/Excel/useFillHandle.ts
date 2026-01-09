import { ref, type Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";

/**
 * useFillHandle 选项
 */
export interface UseFillHandleOptions {
  getSmartValue: (value: string, step: number) => string;
  saveHistory: (state: any) => void;
}

/**
 * useFillHandle 返回值
 */
export interface UseFillHandleReturn {
  isDraggingFill: Ref<boolean>;
  dragStartCell: Ref<CellPosition | null>;
  dragEndCell: Ref<CellPosition | null>;
  shouldShowHandle: (
    row: number,
    col: number,
    normalizedSelection: SelectionRange | null
  ) => boolean;
  startFillDrag: (
    row: number,
    col: number,
    normalizedSelection: SelectionRange | null,
    onMouseUp: () => void
  ) => void;
  handleFillDragEnter: (row: number, col: number) => void;
  isInDragArea: (row: number, col: number) => boolean;
  applyFill: (tableData: string[][], maxRows: number, maxCols: number) => void;
  cleanup: () => void;
}

/**
 * 智能填充管理 Composable
 */
export function useFillHandle({
  getSmartValue,
  saveHistory,
}: UseFillHandleOptions): UseFillHandleReturn {
  const isDraggingFill = ref<boolean>(false);
  const dragStartCell = ref<CellPosition | null>(null);
  const dragEndCell = ref<CellPosition | null>(null);

  /**
   * 判断是否应该显示填充手柄
   */
  const shouldShowHandle = (
    row: number,
    col: number,
    normalizedSelection: SelectionRange | null
  ): boolean => {
    if (!normalizedSelection) return false;
    return (
      row === normalizedSelection.maxRow && col === normalizedSelection.maxCol
    );
  };

  /**
   * 开始填充拖拽
   */
  const startFillDrag = (
    row: number,
    col: number,
    normalizedSelection: SelectionRange | null,
    onMouseUp: () => void
  ): void => {
    if (!normalizedSelection) return;
    isDraggingFill.value = true;
    dragStartCell.value = { row: normalizedSelection.maxRow, col };
    dragEndCell.value = { row, col };
    window.addEventListener("mouseup", onMouseUp);
  };

  /**
   * 处理填充拖拽进入
   */
  const handleFillDragEnter = (row: number, col: number): void => {
    if (!dragStartCell.value) return;
    if (col === dragStartCell.value.col && row >= dragStartCell.value.row) {
      dragEndCell.value = { row, col };
    }
  };

  /**
   * 判断单元格是否在拖拽填充区域内
   */
  const isInDragArea = (row: number, col: number): boolean => {
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
   */
  const applyFill = (
    tableData: string[][],
    maxRows: number,
    maxCols: number
  ): void => {
    if (!isDraggingFill.value || !dragStartCell.value || !dragEndCell.value) {
      return;
    }

    const start = dragStartCell.value;
    const end = dragEndCell.value;

    if (end.row > start.row) {
      saveHistory(tableData);
      const colIndex = start.col;

      if (colIndex < 0 || colIndex >= maxCols) {
        console.warn(`Invalid column index: ${colIndex}`);
        return;
      }

      const baseValue = tableData[start.row]?.[start.col] ?? "";
      for (let r = start.row + 1; r <= end.row; r++) {
        if (r >= 0 && r < maxRows) {
          if (tableData[r]) {
            tableData[r][colIndex] = getSmartValue(baseValue, r - start.row);
          }
        }
      }
    }

    isDraggingFill.value = false;
    dragStartCell.value = null;
    dragEndCell.value = null;
  };

  /**
   * 清理填充状态
   */
  const cleanup = (): void => {
    isDraggingFill.value = false;
    dragStartCell.value = null;
    dragEndCell.value = null;
  };

  return {
    isDraggingFill,
    dragStartCell,
    dragEndCell,
    shouldShowHandle,
    startFillDrag,
    handleFillDragEnter,
    isInDragArea,
    applyFill,
    cleanup,
  };
}
