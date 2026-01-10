import { watch, type Ref, ComputedRef } from "vue";
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
  copiedRange?: Ref<SelectionRange | null>;
  props: {
    enableFillHandle?: boolean;
  };
}

/**
 * useSelectionStyle 返回值
 */
export interface UseSelectionStyleReturn {
  getSelectionBorderClass: (row: number, col: number) => string[];
  getCopiedRangeBorderClass: (row: number, col: number) => string[];
  isSelectionBottomRight: (row: number, col: number) => boolean;
  getDragTargetBorderClass: (row: number, col: number) => string[];
  getMultipleDragBorderClass: (row: number, col: number) => string[];
  clearStyleCache: () => void; // 新增：清除样式缓存
}

/**
 * 选区样式管理 Composable
 *
 * 性能优化：
 * - 添加样式计算结果缓存，减少重复计算
 * - 监听选择状态变化，自动清除缓存
 */
export function useSelectionStyle({
  normalizedSelection,
  multiSelections,
  isMultipleMode,
  isSelecting,
  isInSelection: _isInSelection, // 保留参数以保持接口一致性，但当前未使用
  isInDragArea,
  fillHandleComposable,
  copiedRange,
  props,
}: UseSelectionStyleOptions): UseSelectionStyleReturn {
  // 样式缓存：使用 Map 存储计算结果
  // Key: `${type}-${row}-${col}`, Value: string[]
  const borderClassCache = new Map<string, string[]>();
  const bottomRightCache = new Map<string, boolean>();

  // 监听选择状态变化，清除缓存
  watch(
    [
      normalizedSelection,
      multiSelections,
      isMultipleMode,
      isSelecting,
      copiedRange,
    ],
    () => {
      borderClassCache.clear();
      bottomRightCache.clear();
    },
    { deep: true }
  );
  /**
   * 获取选区边界的 Class（带缓存）
   */
  const getSelectionBorderClass = (row: number, col: number): string[] => {
    const cacheKey = `selection-${row}-${col}`;

    // 检查缓存
    if (borderClassCache.has(cacheKey)) {
      return borderClassCache.get(cacheKey)!;
    }

    const classes: string[] = [];

    const isInMultipleMode =
      isMultipleMode?.value === true ||
      (multiSelections?.value?.length ?? 0) > 0;

    if (isInMultipleMode) {
      borderClassCache.set(cacheKey, classes);
      return classes;
    }

    const selection = normalizedSelection.value;
    if (!selection) {
      borderClassCache.set(cacheKey, classes);
      return classes;
    }

    const inCurrentSelection =
      row >= selection.minRow &&
      row <= selection.maxRow &&
      col >= selection.minCol &&
      col <= selection.maxCol;

    if (!inCurrentSelection) {
      borderClassCache.set(cacheKey, classes);
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

    // 缓存结果（限制缓存大小）
    if (borderClassCache.size > 2000) {
      const keysToDelete = Array.from(borderClassCache.keys()).slice(0, 1000);
      keysToDelete.forEach((key) => borderClassCache.delete(key));
    }
    borderClassCache.set(cacheKey, classes);

    return classes;
  };

  /**
   * 获取复制源区域的边框样式 Class
   */
  const getCopiedRangeBorderClass = (row: number, col: number): string[] => {
    const classes: string[] = [];

    // 检查是否有复制源区域
    const copied = copiedRange?.value;
    if (!copied) {
      return classes;
    }

    // 检查当前单元格是否在复制源区域内
    const inCopiedRange =
      row >= copied.minRow &&
      row <= copied.maxRow &&
      col >= copied.minCol &&
      col <= copied.maxCol;

    if (!inCopiedRange) {
      return classes;
    }

    // 确定边界位置
    const isTop = row === copied.minRow;
    const isBottom = row === copied.maxRow;
    const isLeft = col === copied.minCol;
    const isRight = col === copied.maxCol;

    // 添加边界类和复制状态类
    if (isTop) classes.push("selection-top");
    if (isBottom) classes.push("selection-bottom");
    if (isLeft) classes.push("selection-left");
    if (isRight) classes.push("selection-right");
    classes.push("copy-mode");

    return classes;
  };

  /**
   * 判断是否为选区的右下角（用于显示填充手柄，带缓存）
   */
  const isSelectionBottomRight = (row: number, col: number): boolean => {
    const cacheKey = `bottomRight-${row}-${col}`;

    // 检查缓存
    if (bottomRightCache.has(cacheKey)) {
      return bottomRightCache.get(cacheKey)!;
    }

    const isInMultipleMode =
      isMultipleMode?.value === true ||
      (multiSelections?.value?.length ?? 0) > 0;

    if (isInMultipleMode) {
      bottomRightCache.set(cacheKey, false);
      return false;
    }

    if (!normalizedSelection.value) {
      bottomRightCache.set(cacheKey, false);
      return false;
    }

    const { maxRow, maxCol } = normalizedSelection.value;
    const result = row === maxRow && col === maxCol;

    // 缓存结果（限制缓存大小）
    if (bottomRightCache.size > 1000) {
      const keysToDelete = Array.from(bottomRightCache.keys()).slice(0, 500);
      keysToDelete.forEach((key) => bottomRightCache.delete(key));
    }
    bottomRightCache.set(cacheKey, result);

    return result;
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

  /**
   * 清除样式缓存
   */
  const clearStyleCache = (): void => {
    borderClassCache.clear();
    bottomRightCache.clear();
  };

  return {
    getSelectionBorderClass,
    getCopiedRangeBorderClass,
    isSelectionBottomRight,
    getDragTargetBorderClass,
    getMultipleDragBorderClass,
    clearStyleCache,
  };
}
