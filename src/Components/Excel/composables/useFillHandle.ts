import { ref, onUnmounted, type Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";
import {
  HistoryActionType,
  type SaveHistoryOptions,
  type CellChange,
} from "./useHistory";

/**
 * useFillHandle 选项
 */
export interface UseFillHandleOptions {
  getSmartValue: (value: string, step: number) => string;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
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

  // 保存事件监听器引用，用于清理
  let mouseUpHandler: (() => void) | null = null;

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
    // 保存引用以便清理
    mouseUpHandler = onMouseUp;
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
      const colIndex = start.col;

      if (colIndex < 0 || colIndex >= maxCols) {
        // 错误处理：列索引无效
        if (import.meta.env.DEV) {
          console.warn(`[FillHandle] Invalid column index: ${colIndex}`);
        }
        return;
      }

      // 在填充之前，记录所有将被填充的单元格的原始值
      const changes: CellChange[] = [];
      const baseValue = tableData[start.row]?.[start.col] ?? "";

      for (let r = start.row + 1; r <= end.row; r++) {
        if (r >= 0 && r < maxRows) {
          if (tableData[r]) {
            const oldValue = tableData[r][colIndex] ?? "";
            const newValue = getSmartValue(baseValue, r - start.row);

            // 只记录实际有变化的单元格
            if (oldValue !== newValue) {
              changes.push({
                row: r,
                col: colIndex,
                oldValue,
                newValue,
              });
            }
          }
        }
      }

      // 执行填充操作
      for (let r = start.row + 1; r <= end.row; r++) {
        if (r >= 0 && r < maxRows) {
          if (tableData[r]) {
            tableData[r][colIndex] = getSmartValue(baseValue, r - start.row);
          }
        }
      }

      // 保存历史记录，使用 FILL 类型
      if (changes.length > 0) {
        saveHistory(tableData, {
          type: HistoryActionType.FILL,
          description: `Fill ${changes.length} cell(s)`,
          changes,
          metadata: {
            fillStartRow: start.row,
            fillEndRow: end.row,
            fillCol: colIndex,
          },
        });
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
    // 清理事件监听器
    if (mouseUpHandler) {
      window.removeEventListener("mouseup", mouseUpHandler);
      mouseUpHandler = null;
    }
  };

  // 组件卸载时清理事件监听器
  onUnmounted(() => {
    cleanup();
  });

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
