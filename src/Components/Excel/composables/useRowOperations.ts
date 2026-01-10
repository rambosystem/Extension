import { nextTick, type Ref } from "vue";
import type { CellPosition } from "./types";
import {
  HistoryActionType,
  type SaveHistoryOptions,
  type CellChange,
} from "./useHistory";

/**
 * useRowOperations 选项
 */
export interface UseRowOperationsOptions {
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  activeCell: Ref<CellPosition | null>;
  columns: Ref<string[]>;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
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

    // 先保存历史记录（插入前的状态）
    // 强制创建检查点，因为行操作是结构性变化，需要完整快照来确保正确恢复
    saveHistory(tableData.value, {
      type: HistoryActionType.ROW_INSERT,
      description: "Insert 1 row",
      forceFullSnapshot: true, // 强制创建检查点，因为行操作影响大
      metadata: {
        insertedRowIndex: rowIndex,
        insertedRowCount: 1,
      },
    });

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

    // 在删除之前，记录被删除行的所有单元格数据（包括空单元格）
    // 记录所有单元格确保空行也能正确恢复
    const changes: CellChange[] = [];
    const maxCols = Math.max(
      ...tableData.value.map((row) => row?.length || 0),
      columns.value.length
    );

    // 按从大到小排序，这样删除时索引不会变化
    const sortedIndices = [...validIndices].sort((a, b) => b - a);

    for (const rowIndex of sortedIndices) {
      const rowData = tableData.value[rowIndex] || [];
      // 记录该行的所有单元格（包括空单元格），确保空行也能正确恢复
      for (let col = 0; col < maxCols; col++) {
        const oldValue = rowData[col] ?? "";
        changes.push({
          row: rowIndex,
          col,
          oldValue,
          newValue: "", // 删除行后，这些单元格不存在了
        });
      }
    }

    const oldRowCount = rows.value.length;
    const minDeletedRow = Math.min(...validIndices);
    const maxDeletedRow = Math.max(...validIndices);

    // 先保存历史记录（删除前的状态）
    // 强制创建检查点，因为行删除是结构性变化，需要完整快照
    saveHistory(tableData.value, {
      type: HistoryActionType.ROW_DELETE,
      description: `Delete ${validIndices.length} row(s)`,
      forceFullSnapshot: true, // 强制创建检查点，确保行结构正确恢复
      changes: changes.length > 0 ? changes : undefined,
      metadata: {
        deletedRowIndices: validIndices,
        deletedRowCount: validIndices.length,
      },
    });

    // 然后执行删除操作
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

    // 在删除之前，记录被删除行的所有单元格数据（包括空单元格）
    // 记录所有单元格确保空行也能正确恢复
    const changes: CellChange[] = [];
    const rowIndex = rowIndexOrIndices;
    const rowData = tableData.value[rowIndex] || [];
    const maxCols = Math.max(
      rowData.length,
      columns.value.length,
      ...tableData.value.map((row) => row?.length || 0)
    );

    // 记录该行的所有单元格（包括空单元格），确保空行也能正确恢复
    for (let col = 0; col < maxCols; col++) {
      const oldValue = rowData[col] ?? "";
      changes.push({
        row: rowIndex,
        col,
        oldValue,
        newValue: "", // 删除行后，这些单元格不存在了
      });
    }

    // 先保存历史记录（删除前的状态）
    // 强制创建检查点，因为行删除是结构性变化，需要完整快照
    saveHistory(tableData.value, {
      type: HistoryActionType.ROW_DELETE,
      description: "Delete 1 row",
      forceFullSnapshot: true, // 强制创建检查点，确保行结构正确恢复
      changes: changes.length > 0 ? changes : undefined,
      metadata: {
        deletedRowIndices: [rowIndex],
        deletedRowCount: 1,
      },
    });

    // 然后执行删除操作
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
