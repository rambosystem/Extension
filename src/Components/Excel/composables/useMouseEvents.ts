import type { Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";
import type { UseFillHandleReturn } from "./useFillHandle";
import type { UseColumnWidthReturn } from "./useColumnWidth";
import type { UseRowHeightReturn } from "./useRowHeight";

/**
 * useMouseEvents 选项
 */
export interface UseMouseEventsOptions {
  isSelecting: Ref<boolean>;
  selectionStart: Ref<CellPosition | null>;
  selectionEnd: Ref<CellPosition | null>;
  startSingleSelection: (row: number, col: number) => void;
  updateSingleSelectionEnd: (row: number, col: number) => void;
  startMultipleSelection: (
    row: number,
    col: number
  ) => { containingSelectionIndex: number } | null;
  updateMultipleSelectionEnd: (row: number, col: number) => void;
  endMultipleSelectionClick: (row: number, col: number) => void;
  endMultipleSelectionDrag: (options?: {
    removeSingleCell?: CellPosition | null;
    removeSelectionIndex?: number;
    isCancelMode?: boolean;
  }) => boolean;
  multiSelections: Ref<SelectionRange[]>;
  isEditing: (row: number, col: number) => boolean;
  stopEdit: () => void;
  handleFillDragEnter: (row: number, col: number) => void;
  applyFill: () => void;
  stopColumnResize: () => void;
  stopRowResize: () => void;
  handleColumnResize: (event: MouseEvent) => void;
  handleRowResize: (event: MouseEvent) => void;
  props: {
    enableFillHandle?: boolean;
    enableColumnResize?: boolean;
    enableRowResize?: boolean;
  };
  fillHandleComposable: UseFillHandleReturn | null;
  columnWidthComposable: UseColumnWidthReturn | null;
  rowHeightComposable: UseRowHeightReturn | null;
}

/**
 * useMouseEvents 返回值
 */
export interface UseMouseEventsReturn {
  handleMouseUp: (event: MouseEvent) => void;
  handleCellMouseDown: (
    row: number,
    col: number,
    maxRows: number,
    maxCols: number,
    event?: MouseEvent | null
  ) => void;
  handleMouseEnter: (row: number, col: number) => void;
}

/**
 * 鼠标事件管理 Composable
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
}: UseMouseEventsOptions): UseMouseEventsReturn {
  let isMultipleMode = false;
  let multipleStartCell: CellPosition | null = null;
  let hasMultipleDragged = false;
  let multipleStartSelectionIndex: number | null = null;

  /**
   * 处理鼠标抬起事件
   */
  const handleMouseUp = (event: MouseEvent): void => {
    if (isSelecting.value && isMultipleMode && multipleStartCell) {
      const isClick =
        !hasMultipleDragged ||
        (selectionStart?.value &&
          selectionEnd?.value &&
          selectionStart.value.row === selectionEnd.value.row &&
          selectionStart.value.col === selectionEnd.value.col);

      const isBackToStart =
        selectionEnd?.value &&
        selectionEnd.value.row === multipleStartCell.row &&
        selectionEnd.value.col === multipleStartCell.col;

      if (isClick || isBackToStart) {
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
        if (endMultipleSelectionDrag) {
          if (multipleStartSelectionIndex !== null) {
            endMultipleSelectionDrag({
              removeSelectionIndex: multipleStartSelectionIndex,
              isCancelMode: true,
            });
          } else {
            endMultipleSelectionDrag({ removeSingleCell: multipleStartCell });
          }
        }
      }
    }

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
   */
  const handleCellMouseDown = (
    row: number,
    col: number,
    maxRows: number,
    maxCols: number,
    event: MouseEvent | null = null
  ): void => {
    if (row < 0 || row >= maxRows || col < 0 || col >= maxCols) {
      return;
    }

    if (isEditing(row, col)) {
      return;
    }

    if (stopEdit) {
      stopEdit();
    }

    const isCtrlClick = event && (event.ctrlKey || event.metaKey);

    isMultipleMode = isCtrlClick;
    hasMultipleDragged = false;
    multipleStartCell = isCtrlClick ? { row, col } : null;
    multipleStartSelectionIndex = null;

    isSelecting.value = true;

    if (isCtrlClick) {
      if (startMultipleSelection) {
        const result = startMultipleSelection(row, col);
        if (result && result.containingSelectionIndex !== undefined) {
          multipleStartSelectionIndex = result.containingSelectionIndex;
        }
      }
    } else {
      if (startSingleSelection) {
        startSingleSelection(row, col);
      }
    }

    window.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * 处理鼠标进入单元格事件
   */
  const handleMouseEnter = (row: number, col: number): void => {
    if (isSelecting.value) {
      if (isMultipleMode) {
        if (
          multipleStartCell &&
          (row !== multipleStartCell.row || col !== multipleStartCell.col)
        ) {
          hasMultipleDragged = true;
        }

        if (updateMultipleSelectionEnd) {
          updateMultipleSelectionEnd(row, col);
        }
      } else {
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
