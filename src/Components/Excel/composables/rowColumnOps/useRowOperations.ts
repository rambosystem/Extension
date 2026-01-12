import { nextTick, type Ref } from "vue";
import type { CellPosition } from "../types";
import type { SelectionService } from "../selection/selectionService";
import {
  HistoryActionType,
  type SaveHistoryOptions,
} from "../history/useHistory";

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
  selectionService: SelectionService;
  emitSync: () => void;
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
  selectionService,
  emitSync,
}: UseRowOperationsOptions): UseRowOperationsReturn {
  /**
   * 统一的插入行处理函数
   */
  const handleInsertRowBelow = (rowIndex: number): void => {
    if (typeof rowIndex !== "number" || rowIndex < 0) {
      return;
    }

    insertRowBelow(rowIndex);

    // 保存历史记录（插入后的状态）
    // 强制创建检查点，因为行操作是结构性变化，需要完整快照来确保正确恢复
    saveHistory(tableData.value, {
      type: HistoryActionType.ROW_INSERT,
      description: "Insert 1 row",
      forceFullSnapshot: true, // 强制创建检查点，因为行操作影响大
      metadata: {
        insertedRowIndex: rowIndex + 1,
        insertedRowCount: 1,
      },
    });

    nextTick(() => {
      emitSync();
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

    const oldRowCount = rows.value.length;
    const minDeletedRow = Math.min(...validIndices);
    const maxDeletedRow = Math.max(...validIndices);

    // 按从大到小排序，这样删除时索引不会变化
    const sortedIndices = [...validIndices].sort((a, b) => b - a);

    // 执行删除操作
    for (const rowIndex of sortedIndices) {
      deleteRow(rowIndex);
    }

    const newRowCount = rows.value.length;

    // 保存历史记录（删除后的状态）
    // 强制创建检查点，因为行删除是结构性变化，需要完整快照
    saveHistory(tableData.value, {
      type: HistoryActionType.ROW_DELETE,
      description: `Delete ${validIndices.length} row(s)`,
      forceFullSnapshot: true, // 强制创建检查点，确保行结构正确恢复
      metadata: {
        deletedRowIndices: validIndices,
        deletedRowCount: validIndices.length,
      },
    });

    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      const isCurrentRowDeleted =
        currentRow >= minDeletedRow && currentRow <= maxDeletedRow;

      if (isCurrentRowDeleted) {
        const targetRow = Math.min(minDeletedRow, newRowCount - 1);
        if (targetRow >= 0) {
          selectionService.startSingleSelection(targetRow, safeCol);
        } else if (newRowCount > 0) {
          selectionService.startSingleSelection(0, safeCol);
        }
      } else if (currentRow > maxDeletedRow) {
        const deletedCount = oldRowCount - newRowCount;
        const newRow = currentRow - deletedCount;
        const safeRow = Math.min(newRow, newRowCount - 1);
        selectionService.startSingleSelection(safeRow, safeCol);
      }
    }

    nextTick(() => {
      emitSync();
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

    const rowIndex = rowIndexOrIndices;

    // 执行删除操作
    deleteRow(rowIndexOrIndices);
    const newRowCount = rows.value.length;

    // 保存历史记录（删除后的状态）
    // 强制创建检查点，因为行删除是结构性变化，需要完整快照
    saveHistory(tableData.value, {
      type: HistoryActionType.ROW_DELETE,
      description: "Delete 1 row",
      forceFullSnapshot: true, // 强制创建检查点，确保行结构正确恢复
      metadata: {
        deletedRowIndices: [rowIndex],
        deletedRowCount: 1,
      },
    });

    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      if (currentRow === rowIndexOrIndices) {
        if (rowIndexOrIndices < newRowCount) {
          selectionService.startSingleSelection(rowIndexOrIndices, safeCol);
        } else {
          const newRow = Math.max(0, rowIndexOrIndices - 1);
          selectionService.startSingleSelection(newRow, safeCol);
        }
      } else if (currentRow > rowIndexOrIndices) {
        const newRow = currentRow - 1;
        const safeRow = Math.min(newRow, newRowCount - 1);
        selectionService.startSingleSelection(safeRow, safeCol);
      }
    }

    nextTick(() => {
      emitSync();
    });
  };

  return {
    handleInsertRowBelow,
    handleDeleteRow,
    handleDeleteRows,
  };
}
