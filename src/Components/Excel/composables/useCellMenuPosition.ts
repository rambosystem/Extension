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
 * 鼠标位置
 */
export interface MousePosition {
  x: number;
  y: number;
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
  lastMousePosition?: Ref<MousePosition | null>;
  getCellElement?: (row: number, col: number) => HTMLElement | null;
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
  lastMousePosition,
  getCellElement,
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
   * 计算两个点之间的距离（欧几里得距离）
   */
  const calculateDistance = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  /**
   * 获取单元格的中心点坐标
   */
  const getCellCenter = (
    row: number,
    col: number
  ): { x: number; y: number } | null => {
    if (!getCellElement) return null;
    const cellEl = getCellElement(row, col);
    if (!cellEl) return null;
    const rect = cellEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

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

    const selection = normalizedSelection.value;
    if (!selection) {
      // 没有选区时，使用默认逻辑
      if (activeCell.value) {
        return {
          row: activeCell.value.row,
          col: activeCell.value.col,
        };
      }
      return null;
    }

    // 如果是单单元格选择，直接返回该单元格
    if (
      selection.minRow === selection.maxRow &&
      selection.minCol === selection.maxCol
    ) {
      return {
        row: selection.minRow,
        col: selection.minCol,
      };
    }

    // 多单元格选择：基于鼠标位置选择最近的角
    if (lastMousePosition?.value && getCellElement) {
      const mousePos = lastMousePosition.value;
      const corners: Array<{ row: number; col: number }> = [
        { row: selection.minRow, col: selection.minCol }, // 左上
        { row: selection.minRow, col: selection.maxCol }, // 右上
        { row: selection.maxRow, col: selection.minCol }, // 左下
        { row: selection.maxRow, col: selection.maxCol }, // 右下
      ];

      let minDistance = Infinity;
      let nearestCorner: CellPosition | null = null;

      for (const corner of corners) {
        const cellCenter = getCellCenter(corner.row, corner.col);
        if (cellCenter) {
          const distance = calculateDistance(
            mousePos.x,
            mousePos.y,
            cellCenter.x,
            cellCenter.y
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestCorner = { row: corner.row, col: corner.col };
          }
        }
      }

      if (nearestCorner) {
        return nearestCorner;
      }
    }

    // 多选模式处理：基于最后一次选区，使用鼠标位置计算最近的角
    if (isMultipleMode.value) {
      if (
        multiSelections.value &&
        multiSelections.value.length > 0 &&
        lastMousePosition?.value &&
        getCellElement
      ) {
        // 获取最后一次选区
        const lastSelection =
          multiSelections.value[multiSelections.value.length - 1];

        // 如果是单单元格，直接返回
        if (
          lastSelection.minRow === lastSelection.maxRow &&
          lastSelection.minCol === lastSelection.maxCol
        ) {
          return {
            row: lastSelection.minRow,
            col: lastSelection.minCol,
          };
        }

        // 多单元格：基于鼠标位置选择最近的角
        const mousePos = lastMousePosition.value;
        const corners: Array<{ row: number; col: number }> = [
          { row: lastSelection.minRow, col: lastSelection.minCol }, // 左上
          { row: lastSelection.minRow, col: lastSelection.maxCol }, // 右上
          { row: lastSelection.maxRow, col: lastSelection.minCol }, // 左下
          { row: lastSelection.maxRow, col: lastSelection.maxCol }, // 右下
        ];

        let minDistance = Infinity;
        let nearestCorner: CellPosition | null = null;

        for (const corner of corners) {
          const cellCenter = getCellCenter(corner.row, corner.col);
          if (cellCenter) {
            const distance = calculateDistance(
              mousePos.x,
              mousePos.y,
              cellCenter.x,
              cellCenter.y
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearestCorner = { row: corner.row, col: corner.col };
            }
          }
        }

        if (nearestCorner) {
          return nearestCorner;
        }
      }

      // 回退逻辑：如果没有鼠标位置或无法获取单元格元素，使用默认逻辑
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

    // 如果没有鼠标位置或无法获取单元格元素，使用默认逻辑（右下角）
    return {
      row: selection.maxRow,
      col: selection.maxCol,
    };
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
