import { nextTick, type Ref } from "vue";
import type { CellPosition } from "./types";

/**
 * useRowOperations 选项
 */
export interface UseRowOperationsOptions {
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  activeCell: Ref<CellPosition | null>;
  columns: Ref<string[]>;
  saveHistory: (state: any) => void;
  insertRowBelow: (rowIndex: number) => void;
  deleteRow: (rowIndex: number) => void;
  startSingleSelection: (row: number, col: number) => void;
  notifyDataChange: () => void;
}

/**
 * useRowOperations 返回值
 */
export interface UseRowOperationsReturn {
  handleInsertRowBelow: (rowIndex: number) => void;
  handleDeleteRow: (rowIndexOrIndices: number | number[]) => void;
  handleDeleteRows: (rowIndices: number[]) => void;
}

/**
 * 行操作管理 Composable
 */
export function useRowOperations({
  tableData,
  rows,
  activeCell,
  columns,
  saveHistory,
  insertRowBelow,
  deleteRow,
  startSingleSelection,
  notifyDataChange,
}: UseRowOperationsOptions): UseRowOperationsReturn {
  /**
   * 统一的插入行处理函数
   */
  const handleInsertRowBelow = (rowIndex: number): void => {
    if (typeof rowIndex !== "number" || rowIndex < 0) {
      return;
    }

    saveHistory(tableData.value);
    insertRowBelow(rowIndex);

    nextTick(() => {
      notifyDataChange();
    });
  };

  /**
   * 统一的删除多行处理函数
   */
  const handleDeleteRows = (rowIndices: number[]): void => {
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
      return;
    }

    const validIndices = Array.from(
      new Set(
        rowIndices.filter(
          (idx) =>
            typeof idx === "number" && idx >= 0 && idx < rows.value.length
        )
      )
    );

    if (validIndices.length === 0) {
      return;
    }

    saveHistory(tableData.value);

    const oldRowCount = rows.value.length;
    const minDeletedRow = Math.min(...validIndices);
    const maxDeletedRow = Math.max(...validIndices);

    const sortedIndices = [...validIndices].sort((a, b) => b - a);
    for (const rowIndex of sortedIndices) {
      deleteRow(rowIndex);
    }

    const newRowCount = rows.value.length;

    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      const isCurrentRowDeleted =
        currentRow >= minDeletedRow && currentRow <= maxDeletedRow;

      if (isCurrentRowDeleted) {
        const deletedCount = oldRowCount - newRowCount;
        const targetRow = Math.min(minDeletedRow, newRowCount - 1);
        if (targetRow >= 0) {
          startSingleSelection(targetRow, safeCol);
        } else if (newRowCount > 0) {
          startSingleSelection(0, safeCol);
        }
      } else if (currentRow > maxDeletedRow) {
        const deletedCount = oldRowCount - newRowCount;
        const newRow = currentRow - deletedCount;
        const safeRow = Math.min(newRow, newRowCount - 1);
        startSingleSelection(safeRow, safeCol);
      }
    }

    nextTick(() => {
      notifyDataChange();
    });
  };

  /**
   * 统一的删除行处理函数
   */
  const handleDeleteRow = (rowIndexOrIndices: number | number[]): void => {
    if (Array.isArray(rowIndexOrIndices)) {
      handleDeleteRows(rowIndexOrIndices);
      return;
    }

    if (typeof rowIndexOrIndices !== "number" || rowIndexOrIndices < 0) {
      return;
    }

    saveHistory(tableData.value);

    const oldRowCount = rows.value.length;
    deleteRow(rowIndexOrIndices);
    const newRowCount = rows.value.length;

    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      if (currentRow === rowIndexOrIndices) {
        if (rowIndexOrIndices < newRowCount) {
          startSingleSelection(rowIndexOrIndices, safeCol);
        } else {
          const newRow = Math.max(0, rowIndexOrIndices - 1);
          startSingleSelection(newRow, safeCol);
        }
      } else if (currentRow > rowIndexOrIndices) {
        const newRow = currentRow - 1;
        const safeRow = Math.min(newRow, newRowCount - 1);
        startSingleSelection(safeRow, safeCol);
      }
    }

    nextTick(() => {
      notifyDataChange();
    });
  };

  return {
    handleInsertRowBelow,
    handleDeleteRow,
    handleDeleteRows,
  };
}
