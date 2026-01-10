import type { Ref, ComputedRef } from "vue";
import type {
  CellPosition,
  SelectionRange,
  EndMultipleSelectionDragOptions,
} from "./types";
import type { ExcelSelectionState } from "./useExcelState";

/**
 * useSelection 返回值接口
 */
export interface UseSelectionReturn {
  activeCell: Ref<CellPosition | null>;
  selectionStart: Ref<CellPosition | null>;
  selectionEnd: Ref<CellPosition | null>;
  isSelecting: Ref<boolean>;
  normalizedSelection: ComputedRef<SelectionRange | null>;
  multiSelections: Ref<SelectionRange[]>;
  isMultipleMode: Ref<boolean>;
  startSingleSelection: (row: number, col: number) => void;
  updateSingleSelectionEnd: (row: number, col: number) => void;
  startMultipleSelection: (
    row: number,
    col: number
  ) => { containingSelectionIndex: number } | null;
  updateMultipleSelectionEnd: (row: number, col: number) => void;
  endMultipleSelectionClick: (row: number, col: number) => void;
  endMultipleSelectionDrag: (
    options?: EndMultipleSelectionDragOptions
  ) => boolean;
  updateSelectionEnd: (row: number, col: number) => void;
  isActive: (row: number, col: number) => boolean;
  isInSelection: (row: number, col: number) => boolean;
  isInMultiSelectionOnly: (row: number, col: number) => boolean;
  shouldUseMultiSelectionStyle: (row: number, col: number) => boolean;
  isInSelectionHeader: (index: number, type: "row" | "col") => boolean;
  moveActiveCell: (
    rOffset: number,
    cOffset: number,
    maxRows: number,
    maxCols: number,
    extendSelection?: boolean
  ) => void;
  clearMultiSelections: () => void;
  clearSelection: () => void;
  selectRow: (
    rowIndex: number,
    maxCols: number,
    addToMultiSelect?: boolean
  ) => void;
  selectColumn: (
    colIndex: number,
    maxRows: number,
    addToMultiSelect?: boolean
  ) => void;
  selectRows: (startRow: number, endRow: number, maxCols: number) => void;
  selectColumns: (startCol: number, endCol: number, maxRows: number) => void;
  selectAll: (maxRows: number, maxCols: number) => void;
}

/**
 * useSelection 选项
 */
export interface UseSelectionOptions {
  /**
   * 统一状态管理（必需）
   * 使用统一状态管理，不再创建独立状态
   */
  state: ExcelSelectionState;
}

/**
 * Excel 选择逻辑 Composable
 *
 * 用于通用组件 Excel 的内部状态管理
 *
 * 设计原则：
 * - 通用组件（Components/Common/）应该自包含，不依赖 Store
 * - 每个组件实例拥有独立的选择状态，保证组件的可复用性
 * - 这是通用组件的标准做法，符合组件化设计原则
 *
 * 模式说明：
 * - SINGLE 模式：普通选择（点击、拖选），只有一个选区
 * - MULTIPLE 模式：Ctrl+选择（点击、拖选），可以有多个选区
 *
 * 模式切换规则：
 * 1. 两种模式完全独立，互不干扰
 * 2. 从 MULTIPLE 模式切换到 SINGLE 模式时，清空多选列表（multiSelections）
 * 3. 从 SINGLE 模式切换到 MULTIPLE 模式时，保留之前 SINGLE 模式的选区（加入 multiSelections）
 *
 * 选择状态记录：
 * - SINGLE 模式：使用 selectionStart 和 selectionEnd（通过 normalizedSelection 计算）
 * - MULTIPLE 模式：使用 multiSelections 数组
 * - 两种模式通过 isInSelection 函数统一检查，使用同一个"矩阵"记录选择状态
 *
 * 多选逻辑详解：
 *
 * 1. 开始多选（startMultipleSelection）:
 *    - 检查点击位置是否在已有选区内
 *    - 如果在，返回包含的选区索引（用于后续删除）
 *    - 如果不在，将当前 SINGLE 模式选区加入 multiSelections，然后开始新的选择
 *
 * 2. 结束多选点击（endMultipleSelectionClick）:
 *    - 如果点击在已有选区内：
 *      a. 单格选区：直接删除
 *      b. 多格选区：拆分成多个单格选区，移除点击的单元格
 *    - 如果点击在选区外：添加新的单格选区
 *    - 使用 optimizeSelections 优化选区（合并相邻单元格）
 *
 * 3. 结束多选拖选（endMultipleSelectionDrag）:
 *    - 如果 isCancelMode：从指定选区中移除拖选范围
 *    - 否则：添加新的选区到 multiSelections
 *    - 使用 optimizeSelections 优化选区
 *
 * 4. 选区优化（optimizeSelections）:
 *    - 将多个单格选区合并成尽可能大的矩形选区
 *    - 使用矩阵切割算法，从左上角开始，尽可能向右下扩展
 *    - 确保所有单元格都被包含，且选区数量最少
 *
 * 使用方式：
 * ```typescript
 * const excelState = useExcelState();
 * const selection = useSelection({ state: excelState.selection });
 * ```
 */
export function useSelection({
  state,
}: UseSelectionOptions): UseSelectionReturn {
  const {
    activeCell,
    selectionStart,
    selectionEnd,
    isSelecting,
    multiSelections,
    isMultipleMode,
    normalizedSelection,
  } = state;

  /**
   * 判断单元格是否在选区范围内
   */
  const isCellInRange = (
    row: number,
    col: number,
    range: SelectionRange
  ): boolean => {
    return (
      row >= range.minRow &&
      row <= range.maxRow &&
      col >= range.minCol &&
      col <= range.maxCol
    );
  };

  // ==================== SINGLE 模式：普通选择 ====================

  /**
   * SINGLE 模式：开始选择（点击）
   */
  const startSingleSelection = (row: number, col: number): void => {
    isMultipleMode.value = false;
    multiSelections.value = [];
    const newPos: CellPosition = { row, col };
    activeCell.value = newPos;
    selectionStart.value = newPos;
    selectionEnd.value = newPos;
  };

  /**
   * SINGLE 模式：更新选择终点（拖选）
   */
  const updateSingleSelectionEnd = (row: number, col: number): void => {
    selectionEnd.value = { row, col };
  };

  // ==================== MULTIPLE 模式：Ctrl+选择 ====================

  /**
   * MULTIPLE 模式：开始选择（Ctrl+点击）
   */
  const startMultipleSelection = (
    row: number,
    col: number
  ): { containingSelectionIndex: number } | null => {
    isMultipleMode.value = true;

    const containingSelectionIndex = multiSelections.value.findIndex((sel) =>
      isCellInRange(row, col, sel)
    );

    if (containingSelectionIndex >= 0) {
      const newPos: CellPosition = { row, col };
      activeCell.value = newPos;
      selectionStart.value = newPos;
      selectionEnd.value = newPos;
      return { containingSelectionIndex };
    }

    const currentSelection = normalizedSelection.value;
    if (currentSelection) {
      const currentIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === currentSelection.minRow &&
          sel.maxRow === currentSelection.maxRow &&
          sel.minCol === currentSelection.minCol &&
          sel.maxCol === currentSelection.maxCol
      );
      if (currentIndex < 0) {
        multiSelections.value.push({ ...currentSelection });
      }
    }

    const newPos: CellPosition = { row, col };
    activeCell.value = newPos;
    selectionStart.value = newPos;
    selectionEnd.value = newPos;
    return null;
  };

  /**
   * MULTIPLE 模式：更新选择终点（Ctrl+拖选）
   */
  const updateMultipleSelectionEnd = (row: number, col: number): void => {
    selectionEnd.value = { row, col };
  };

  /**
   * 将大选区拆分成多个单格选区
   */
  const splitSelectionIntoCells = (
    selection: SelectionRange,
    excludeRow: number | null = null,
    excludeCol: number | null = null
  ): SelectionRange[] => {
    const { minRow, maxRow, minCol, maxCol } = selection;
    const cells: SelectionRange[] = [];

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (
          excludeRow !== null &&
          excludeCol !== null &&
          r === excludeRow &&
          c === excludeCol
        ) {
          continue;
        }
        cells.push({
          minRow: r,
          maxRow: r,
          minCol: c,
          maxCol: c,
        });
      }
    }

    return cells;
  };

  /**
   * 矩阵切割算法：将多个选区（特别是单格选区）合并成尽可能大的矩形选区
   */
  const optimizeSelections = (
    selections: SelectionRange[]
  ): SelectionRange[] => {
    if (!selections || selections.length === 0) {
      return [];
    }

    const cellSet = new Set<string>();
    selections.forEach((sel) => {
      for (let r = sel.minRow; r <= sel.maxRow; r++) {
        for (let c = sel.minCol; c <= sel.maxCol; c++) {
          cellSet.add(`${r},${c}`);
        }
      }
    });

    if (cellSet.size === 0) {
      return [];
    }

    const cells = Array.from(cellSet)
      .map((key) => {
        const [row, col] = key.split(",").map(Number);
        return { row, col };
      })
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });

    const optimized: SelectionRange[] = [];
    const used = new Set<string>();

    for (let i = 0; i < cells.length; i++) {
      if (used.has(`${cells[i].row},${cells[i].col}`)) {
        continue;
      }

      let minRow = cells[i].row;
      let maxRow = cells[i].row;
      let minCol = cells[i].col;
      let maxCol = cells[i].col;

      let canExpandRow = true;
      while (canExpandRow) {
        const nextRow = maxRow + 1;
        let rowComplete = true;

        for (let c = minCol; c <= maxCol; c++) {
          const key = `${nextRow},${c}`;
          if (!cellSet.has(key) || used.has(key)) {
            rowComplete = false;
            break;
          }
        }

        if (rowComplete) {
          maxRow = nextRow;
        } else {
          canExpandRow = false;
        }
      }

      let canExpandCol = true;
      while (canExpandCol) {
        const nextCol = maxCol + 1;
        let colComplete = true;

        for (let r = minRow; r <= maxRow; r++) {
          const key = `${r},${nextCol}`;
          if (!cellSet.has(key) || used.has(key)) {
            colComplete = false;
            break;
          }
        }

        if (colComplete) {
          maxCol = nextCol;
        } else {
          canExpandCol = false;
        }
      }

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          used.add(`${r},${c}`);
        }
      }

      optimized.push({
        minRow,
        maxRow,
        minCol,
        maxCol,
      });
    }

    return optimized;
  };

  /**
   * MULTIPLE 模式：结束选择（Ctrl+单击）
   */
  const endMultipleSelectionClick = (row: number, col: number): void => {
    const containingSelectionIndex = multiSelections.value.findIndex((sel) =>
      isCellInRange(row, col, sel)
    );

    if (containingSelectionIndex >= 0) {
      const containingSelection =
        multiSelections.value[containingSelectionIndex];

      if (
        containingSelection.minRow === containingSelection.maxRow &&
        containingSelection.minCol === containingSelection.maxCol
      ) {
        multiSelections.value.splice(containingSelectionIndex, 1);
      } else {
        const newCells = splitSelectionIntoCells(containingSelection, row, col);
        multiSelections.value.splice(containingSelectionIndex, 1);
        newCells.forEach((cell) => {
          multiSelections.value.push(cell);
        });
        multiSelections.value = optimizeSelections(multiSelections.value);
      }

      if (multiSelections.value.length > 0) {
        let targetSelection: SelectionRange | null = null;
        const adjacentCells: CellPosition[] = [
          { row: row - 1, col },
          { row: row + 1, col },
          { row, col: col - 1 },
          { row, col: col + 1 },
        ];

        for (const cell of adjacentCells) {
          const found = multiSelections.value.find((sel) =>
            isCellInRange(cell.row, cell.col, sel)
          );
          if (found) {
            targetSelection = found;
            activeCell.value = { row: cell.row, col: cell.col };
            selectionStart.value = { row: cell.row, col: cell.col };
            selectionEnd.value = { row: found.maxRow, col: found.maxCol };
            break;
          }
        }

        if (!targetSelection) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        }
      } else {
        isMultipleMode.value = false;
        activeCell.value = null;
        selectionStart.value = null;
        selectionEnd.value = null;
      }
    } else {
      const newSelection: SelectionRange = {
        minRow: row,
        maxRow: row,
        minCol: col,
        maxCol: col,
      };
      multiSelections.value.push(newSelection);
      multiSelections.value = optimizeSelections(multiSelections.value);
      activeCell.value = { row, col };
      selectionStart.value = { row, col };
      selectionEnd.value = { row, col };
    }
  };

  /**
   * 从选区中移除拖选范围内的所有单元格
   */
  const removeDragRangeFromSelection = (
    selection: SelectionRange,
    dragRange: SelectionRange
  ): SelectionRange[] => {
    const { minRow, maxRow, minCol, maxCol } = selection;
    const {
      minRow: dragMinRow,
      maxRow: dragMaxRow,
      minCol: dragMinCol,
      maxCol: dragMaxCol,
    } = dragRange;
    const remainingCells: SelectionRange[] = [];

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (
          r < dragMinRow ||
          r > dragMaxRow ||
          c < dragMinCol ||
          c > dragMaxCol
        ) {
          remainingCells.push({
            minRow: r,
            maxRow: r,
            minCol: c,
            maxCol: c,
          });
        }
      }
    }

    return remainingCells;
  };

  /**
   * MULTIPLE 模式：结束选择（Ctrl+拖选）
   */
  const endMultipleSelectionDrag = (
    options: EndMultipleSelectionDragOptions = {}
  ): boolean => {
    const selection = normalizedSelection.value;
    if (!selection) return false;

    const { removeSingleCell, removeSelectionIndex, isCancelMode } = options;

    if (
      isCancelMode &&
      removeSelectionIndex !== undefined &&
      removeSelectionIndex >= 0
    ) {
      const originalSelection = multiSelections.value[removeSelectionIndex];
      const remainingCells = removeDragRangeFromSelection(
        originalSelection,
        selection
      );
      multiSelections.value.splice(removeSelectionIndex, 1);
      remainingCells.forEach((cell) => {
        multiSelections.value.push(cell);
      });
      multiSelections.value = optimizeSelections(multiSelections.value);

      if (multiSelections.value.length > 0) {
        const startRow = selectionStart.value?.row;
        const startCol = selectionStart.value?.col;
        let targetSelection: SelectionRange | null = null;

        if (startRow !== undefined && startCol !== undefined) {
          targetSelection =
            multiSelections.value.find((sel) =>
              isCellInRange(startRow, startCol, sel)
            ) ?? null;

          if (targetSelection) {
            activeCell.value = { row: startRow, col: startCol };
            selectionStart.value = { row: startRow, col: startCol };
            selectionEnd.value = {
              row: targetSelection.maxRow,
              col: targetSelection.maxCol,
            };
          } else {
            const adjacentCells: CellPosition[] = [
              { row: startRow - 1, col: startCol },
              { row: startRow + 1, col: startCol },
              { row: startRow, col: startCol - 1 },
              { row: startRow, col: startCol + 1 },
            ];

            for (const cell of adjacentCells) {
              const found = multiSelections.value.find((sel) =>
                isCellInRange(cell.row, cell.col, sel)
              );
              if (found) {
                targetSelection = found;
                activeCell.value = { row: cell.row, col: cell.col };
                selectionStart.value = { row: cell.row, col: cell.col };
                selectionEnd.value = { row: found.maxRow, col: found.maxCol };
                break;
              }
            }
          }
        }

        if (!targetSelection) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        }
      } else {
        isMultipleMode.value = false;
        activeCell.value = null;
        selectionStart.value = null;
        selectionEnd.value = null;
      }

      return true;
    }

    if (removeSingleCell) {
      const { row, col } = removeSingleCell;
      const singleCellIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === row &&
          sel.maxRow === row &&
          sel.minCol === col &&
          sel.maxCol === col
      );
      if (singleCellIndex >= 0) {
        multiSelections.value.splice(singleCellIndex, 1);
      }
    }

    multiSelections.value.push({ ...selection });
    multiSelections.value = optimizeSelections(multiSelections.value);

    const startRow = selectionStart.value?.row;
    const startCol = selectionStart.value?.col;
    const targetSelection =
      startRow !== undefined && startCol !== undefined
        ? multiSelections.value.find((sel) =>
            isCellInRange(startRow, startCol, sel)
          )
        : null;

    if (targetSelection) {
      activeCell.value = {
        row: startRow!,
        col: startCol!,
      };
      selectionStart.value = {
        row: startRow!,
        col: startCol!,
      };
      selectionEnd.value = {
        row: targetSelection.maxRow,
        col: targetSelection.maxCol,
      };
    } else if (multiSelections.value.length > 0) {
      const last = multiSelections.value[multiSelections.value.length - 1];
      activeCell.value = { row: last.minRow, col: last.minCol };
      selectionStart.value = { row: last.minRow, col: last.minCol };
      selectionEnd.value = { row: last.maxRow, col: last.maxCol };
    }

    return true;
  };

  // ==================== 通用函数 ====================

  const updateSelectionEnd = (row: number, col: number): void => {
    selectionEnd.value = { row, col };
  };

  const isActive = (row: number, col: number): boolean => {
    return activeCell.value?.row === row && activeCell.value?.col === col;
  };

  /**
   * 判断单元格是否在任意选区内（包括当前选区和多选列表）
   */
  const isInSelection = (row: number, col: number): boolean => {
    if (multiSelections.value && multiSelections.value.length > 0) {
      const inMultiSelection = multiSelections.value.some(
        (sel) =>
          row >= sel.minRow &&
          row <= sel.maxRow &&
          col >= sel.minCol &&
          col <= sel.maxCol
      );
      if (inMultiSelection) {
        return true;
      }
    }

    const range = normalizedSelection.value;
    if (range) {
      if (
        row >= range.minRow &&
        row <= range.maxRow &&
        col >= range.minCol &&
        col <= range.maxCol
      ) {
        return true;
      }
    }

    return false;
  };

  /**
   * 判断单元格是否在多选列表中（但不在当前选区中）
   */
  const isInMultiSelectionOnly = (row: number, col: number): boolean => {
    const range = normalizedSelection.value;
    if (range) {
      if (
        row >= range.minRow &&
        row <= range.maxRow &&
        col >= range.minCol &&
        col <= range.maxCol
      ) {
        return false;
      }
    }

    return multiSelections.value.some(
      (sel) =>
        row >= sel.minRow &&
        row <= sel.maxRow &&
        col >= sel.minCol &&
        col <= sel.maxCol
    );
  };

  /**
   * 判断单元格是否应该使用多选背景色
   */
  const shouldUseMultiSelectionStyle = (row: number, col: number): boolean => {
    if (
      multiSelections &&
      multiSelections.value &&
      multiSelections.value.length > 0
    ) {
      return isInSelection(row, col);
    }
    return false;
  };

  /**
   * 判断表头是否在任意选区内
   */
  const isInSelectionHeader = (index: number, type: "row" | "col"): boolean => {
    const range = normalizedSelection.value;
    if (range) {
      const inCurrentSelection =
        type === "row"
          ? index >= range.minRow && index <= range.maxRow
          : index >= range.minCol && index <= range.maxCol;
      if (inCurrentSelection) return true;
    }

    return multiSelections.value.some((sel) => {
      return type === "row"
        ? index >= sel.minRow && index <= sel.maxRow
        : index >= sel.minCol && index <= sel.maxCol;
    });
  };

  /**
   * 移动活动单元格（用于键盘导航）
   */
  const moveActiveCell = (
    rOffset: number,
    cOffset: number,
    maxRows: number,
    maxCols: number,
    extendSelection = false
  ): void => {
    if (!activeCell.value) return;

    const currentRow = extendSelection
      ? selectionEnd.value!.row
      : activeCell.value.row;
    const currentCol = extendSelection
      ? selectionEnd.value!.col
      : activeCell.value.col;

    const newRow = Math.max(0, Math.min(maxRows - 1, currentRow + rOffset));
    const newCol = Math.max(0, Math.min(maxCols - 1, currentCol + cOffset));
    const newPos: CellPosition = { row: newRow, col: newCol };

    if (extendSelection) {
      selectionEnd.value = newPos;
    } else {
      activeCell.value = newPos;
      selectionStart.value = newPos;
      selectionEnd.value = newPos;
    }
  };

  /**
   * 清除所有多选
   */
  const clearMultiSelections = (): void => {
    multiSelections.value = [];
  };

  /**
   * 清除所有选择状态
   */
  const clearSelection = (): void => {
    activeCell.value = null;
    selectionStart.value = null;
    selectionEnd.value = null;
    multiSelections.value = [];
    isMultipleMode.value = false;
  };

  /**
   * 全选指定行
   */
  const selectRow = (
    rowIndex: number,
    maxCols: number,
    addToMultiSelect = false
  ): void => {
    if (addToMultiSelect) {
      isMultipleMode.value = true;
      const newSelection: SelectionRange = {
        minRow: rowIndex,
        maxRow: rowIndex,
        minCol: 0,
        maxCol: maxCols - 1,
      };

      const existingIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === newSelection.minRow &&
          sel.maxRow === newSelection.maxRow &&
          sel.minCol === newSelection.minCol &&
          sel.maxCol === newSelection.maxCol
      );

      if (existingIndex >= 0) {
        multiSelections.value.splice(existingIndex, 1);
        if (multiSelections.value.length > 0) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        } else {
          isMultipleMode.value = false;
          activeCell.value = null;
          selectionStart.value = null;
          selectionEnd.value = null;
        }
      } else {
        multiSelections.value.push(newSelection);
        multiSelections.value = optimizeSelections(multiSelections.value);
        activeCell.value = { row: rowIndex, col: 0 };
        selectionStart.value = { row: rowIndex, col: 0 };
        selectionEnd.value = { row: rowIndex, col: maxCols - 1 };
      }
    } else {
      isMultipleMode.value = false;
      multiSelections.value = [];
      activeCell.value = { row: rowIndex, col: 0 };
      selectionStart.value = { row: rowIndex, col: 0 };
      selectionEnd.value = { row: rowIndex, col: maxCols - 1 };
    }
  };

  /**
   * 全选指定列
   */
  const selectColumn = (
    colIndex: number,
    maxRows: number,
    addToMultiSelect = false
  ): void => {
    if (addToMultiSelect) {
      isMultipleMode.value = true;
      const newSelection: SelectionRange = {
        minRow: 0,
        maxRow: maxRows - 1,
        minCol: colIndex,
        maxCol: colIndex,
      };

      const existingIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === newSelection.minRow &&
          sel.maxRow === newSelection.maxRow &&
          sel.minCol === newSelection.minCol &&
          sel.maxCol === newSelection.maxCol
      );

      if (existingIndex >= 0) {
        multiSelections.value.splice(existingIndex, 1);
        if (multiSelections.value.length > 0) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        } else {
          isMultipleMode.value = false;
          activeCell.value = null;
          selectionStart.value = null;
          selectionEnd.value = null;
        }
      } else {
        multiSelections.value.push(newSelection);
        multiSelections.value = optimizeSelections(multiSelections.value);
        activeCell.value = { row: 0, col: colIndex };
        selectionStart.value = { row: 0, col: colIndex };
        selectionEnd.value = { row: maxRows - 1, col: colIndex };
      }
    } else {
      isMultipleMode.value = false;
      multiSelections.value = [];
      activeCell.value = { row: 0, col: colIndex };
      selectionStart.value = { row: 0, col: colIndex };
      selectionEnd.value = { row: maxRows - 1, col: colIndex };
    }
  };

  /**
   * 全选多行（拖选）
   */
  const selectRows = (
    startRow: number,
    endRow: number,
    maxCols: number
  ): void => {
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    isMultipleMode.value = false;
    multiSelections.value = [];
    activeCell.value = { row: minRow, col: 0 };
    selectionStart.value = { row: minRow, col: 0 };
    selectionEnd.value = { row: maxRow, col: maxCols - 1 };
  };

  /**
   * 全选多列（拖选）
   */
  const selectColumns = (
    startCol: number,
    endCol: number,
    maxRows: number
  ): void => {
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    isMultipleMode.value = false;
    multiSelections.value = [];
    activeCell.value = { row: 0, col: minCol };
    selectionStart.value = { row: 0, col: minCol };
    selectionEnd.value = { row: maxRows - 1, col: maxCol };
  };

  /**
   * 全选整个表格
   */
  const selectAll = (maxRows: number, maxCols: number): void => {
    isMultipleMode.value = false;
    multiSelections.value = [];
    activeCell.value = { row: 0, col: 0 };
    selectionStart.value = { row: 0, col: 0 };
    selectionEnd.value = { row: maxRows - 1, col: maxCols - 1 };
  };

  return {
    activeCell,
    selectionStart,
    selectionEnd,
    isSelecting,
    normalizedSelection,
    multiSelections,
    isMultipleMode,
    startSingleSelection,
    updateSingleSelectionEnd,
    startMultipleSelection,
    updateMultipleSelectionEnd,
    endMultipleSelectionClick,
    endMultipleSelectionDrag,
    updateSelectionEnd,
    isActive,
    isInSelection,
    isInMultiSelectionOnly,
    shouldUseMultiSelectionStyle,
    isInSelectionHeader,
    moveActiveCell,
    clearMultiSelections,
    clearSelection,
    selectRow,
    selectColumn,
    selectRows,
    selectColumns,
    selectAll,
  };
}
