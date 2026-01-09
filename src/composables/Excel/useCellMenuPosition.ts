import { computed, nextTick, type Ref, type ComputedRef } from "vue";
import type { CellPosition, SelectionRange } from "./types";

/**
 * 菜单上下文对象
 */
export interface MenuContext {
  normalizedSelection: SelectionRange | null;
  multiSelections: SelectionRange[];
  isMultipleMode: boolean;
  activeCell: CellPosition | null;
  rowIndex: number;
  tableData: string[][];
  updateCell: (row: number, col: number, value: string) => void;
  getData: () => string[][];
  setData: (data: string[][]) => void;
}

/**
 * useCellMenuPosition 选项
 */
export interface UseCellMenuPositionOptions {
  editingCell: Ref<CellPosition | null>;
  isSelecting: Ref<boolean>;
  isMultipleMode: Ref<boolean>;
  activeCell: Ref<CellPosition | null>;
  normalizedSelection: ComputedRef<SelectionRange | null>;
  multiSelections: Ref<SelectionRange[]>;
  tableData: Ref<string[][]>;
  updateCell: (row: number, col: number, value: string) => void;
  notifyDataChange: () => void;
  getData: () => string[][];
  setDataWithSync: (data: string[][]) => void;
}

/**
 * useCellMenuPosition 返回值
 */
export interface UseCellMenuPositionReturn {
  cellMenuPosition: ComputedRef<CellPosition | null>;
  shouldShowCellMenu: (rowIndex: number, colIndex: number) => boolean;
  createMenuContext: (rowIndex: number) => MenuContext;
}

/**
 * 单元格菜单位置管理 Composable
 */
export function useCellMenuPosition({
  editingCell,
  isSelecting,
  isMultipleMode,
  activeCell,
  normalizedSelection,
  multiSelections,
  tableData,
  updateCell,
  notifyDataChange,
  getData,
  setDataWithSync,
}: UseCellMenuPositionOptions): UseCellMenuPositionReturn {
  /**
   * 获取多选模式下菜单按钮应该显示的位置
   */
  const getLastCellInMultiSelections = computed<CellPosition | null>(() => {
    if (!multiSelections.value || multiSelections.value.length === 0) {
      return null;
    }

    const lastSelection =
      multiSelections.value[multiSelections.value.length - 1];

    return {
      row: lastSelection.maxRow,
      col: lastSelection.maxCol,
    };
  });

  /**
   * 计算菜单按钮应该显示的位置
   */
  const cellMenuPosition = computed<CellPosition | null>(() => {
    if (editingCell.value) {
      return null;
    }

    if (isSelecting.value) {
      return null;
    }

    if (isMultipleMode.value) {
      const lastCell = getLastCellInMultiSelections.value;
      if (lastCell) {
        return lastCell;
      }
      if (activeCell.value) {
        return {
          row: activeCell.value.row,
          col: activeCell.value.col,
        };
      }
      return null;
    }

    const selection = normalizedSelection.value;
    if (selection) {
      const isMultiCellSelection =
        selection.minRow !== selection.maxRow ||
        selection.minCol !== selection.maxCol;

      if (isMultiCellSelection) {
        return {
          row: selection.maxRow,
          col: selection.maxCol,
        };
      }
    }

    if (activeCell.value) {
      return {
        row: activeCell.value.row,
        col: activeCell.value.col,
      };
    }

    return null;
  });

  /**
   * 判断是否应该显示单元格菜单按钮
   */
  const shouldShowCellMenu = (rowIndex: number, colIndex: number): boolean => {
    const position = cellMenuPosition.value;
    if (!position) {
      return false;
    }
    return position.row === rowIndex && position.col === colIndex;
  };

  /**
   * 创建菜单上下文对象
   */
  const createMenuContext = (rowIndex: number): MenuContext => {
    let effectiveSelection = normalizedSelection.value;

    if (
      isMultipleMode.value &&
      multiSelections.value &&
      multiSelections.value.length > 0
    ) {
      effectiveSelection =
        multiSelections.value[multiSelections.value.length - 1];
    }

    return {
      normalizedSelection: effectiveSelection,
      multiSelections: multiSelections.value,
      isMultipleMode: isMultipleMode.value,
      activeCell: activeCell.value,
      rowIndex,
      tableData: tableData.value,
      updateCell: (row: number, col: number, value: string) => {
        updateCell(row, col, value);
        nextTick(() => {
          notifyDataChange();
        });
      },
      getData: () => getData(),
      setData: (data: string[][]) => {
        setDataWithSync(data);
      },
    };
  };

  return {
    cellMenuPosition,
    shouldShowCellMenu,
    createMenuContext,
  };
}
