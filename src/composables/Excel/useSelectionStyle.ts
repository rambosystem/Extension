import type { Ref, ComputedRef } from "vue";
import type { SelectionRange } from "./types";
import type { UseFillHandleReturn } from "./useFillHandle";

/**
 * useSelectionStyle 选项
 */
export interface UseSelectionStyleOptions {
  normalizedSelection: ComputedRef<SelectionRange | null>;
  multiSelections: Ref<SelectionRange[]>;
  isMultipleMode: Ref<boolean>;
  isSelecting: Ref<boolean>;
  isInSelection: (row: number, col: number) => boolean;
  isInDragArea: (row: number, col: number) => boolean;
  fillHandleComposable: UseFillHandleReturn | null;
  props: {
    enableFillHandle?: boolean;
  };
}

/**
 * useSelectionStyle 返回值
 */
export interface UseSelectionStyleReturn {
  getSelectionBorderClass: (row: number, col: number) => string[];
  isSelectionBottomRight: (row: number, col: number) => boolean;
  getDragTargetBorderClass: (row: number, col: number) => string[];
  getMultipleDragBorderClass: (row: number, col: number) => string[];
}

/**
 * 选区样式管理 Composable
 */
export function useSelectionStyle({
  normalizedSelection,
  multiSelections,
  isMultipleMode,
  isSelecting,
  isInSelection,
  isInDragArea,
  fillHandleComposable,
  props,
}: UseSelectionStyleOptions): UseSelectionStyleReturn {
  /**
   * 获取选区边界的 Class
   */
  const getSelectionBorderClass = (row: number, col: number): string[] => {
    const classes: string[] = [];

    const isInMultipleMode =
      isMultipleMode?.value === true ||
      (multiSelections?.value?.length ?? 0) > 0;

    if (isInMultipleMode) {
      return classes;
    }

    const selection = normalizedSelection.value;
    if (!selection) {
      return classes;
    }

    const inCurrentSelection =
      row >= selection.minRow &&
      row <= selection.maxRow &&
      col >= selection.minCol &&
      col <= selection.maxCol;

    if (!inCurrentSelection) {
      return classes;
    }

    const isTop = row === selection.minRow;
    const isBottom = row === selection.maxRow;
    const isLeft = col === selection.minCol;
    const isRight = col === selection.maxCol;

    if (isTop) classes.push("selection-top");
    if (isBottom) classes.push("selection-bottom");
    if (isLeft) classes.push("selection-left");
    if (isRight) classes.push("selection-right");

    return classes;
  };

  /**
   * 判断是否为选区的右下角（用于显示填充手柄）
   */
  const isSelectionBottomRight = (row: number, col: number): boolean => {
    const isInMultipleMode =
      isMultipleMode?.value === true ||
      (multiSelections?.value?.length ?? 0) > 0;

    if (isInMultipleMode) {
      return false;
    }

    if (!normalizedSelection.value) return false;
    const { maxRow, maxCol } = normalizedSelection.value;
    return row === maxRow && col === maxCol;
  };

  /**
   * 获取多选模式下拖选边界的 Class
   */
  const getMultipleDragBorderClass = (row: number, col: number): string[] => {
    const classes: string[] = [];

    const isInMultipleMode =
      isMultipleMode?.value === true ||
      (multiSelections?.value?.length ?? 0) > 0;

    if (!isInMultipleMode || !isSelecting?.value) {
      return classes;
    }

    const selection = normalizedSelection.value;
    if (!selection) {
      return classes;
    }

    const inCurrentDragSelection =
      row >= selection.minRow &&
      row <= selection.maxRow &&
      col >= selection.minCol &&
      col <= selection.maxCol;

    if (!inCurrentDragSelection) {
      return classes;
    }

    const isTop = row === selection.minRow;
    const isBottom = row === selection.maxRow;
    const isLeft = col === selection.minCol;
    const isRight = col === selection.maxCol;

    if (isTop) classes.push("selection-top");
    if (isBottom) classes.push("selection-bottom");
    if (isLeft) classes.push("selection-left");
    if (isRight) classes.push("selection-right");

    return classes;
  };

  /**
   * 获取拖拽填充区域边界的 Class
   */
  const getDragTargetBorderClass = (row: number, col: number): string[] => {
    if (!props.enableFillHandle || !fillHandleComposable) return [];
    if (!isInDragArea(row, col)) return [];

    const { dragStartCell, dragEndCell } = fillHandleComposable;
    if (!dragStartCell.value || !dragEndCell.value) return [];

    const startRow = dragStartCell.value.row;
    const endRow = dragEndCell.value.row;
    const colIndex = dragStartCell.value.col;

    if (col !== colIndex) return [];

    const classes: string[] = [];
    if (row === startRow + 1) classes.push("drag-target-top");
    if (row === endRow) classes.push("drag-target-bottom");
    classes.push("drag-target-left");
    classes.push("drag-target-right");

    return classes;
  };

  return {
    getSelectionBorderClass,
    isSelectionBottomRight,
    getDragTargetBorderClass,
    getMultipleDragBorderClass,
  };
}
