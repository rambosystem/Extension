import { nextTick, type Ref } from "vue";
import type { CellPosition } from "../types";
import {
  HistoryActionType,
  type SaveHistoryOptions,
  type CellChange,
} from "../useHistory";

/**
 * 行操作处理选项
 */
export interface RowOperationHandlerOptions {
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  activeCell?: Ref<CellPosition | null> | null;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
  insertRowBelow: (rowIndex: number) => void;
  deleteRow: (rowIndex: number) => void;
  startSingleSelection: (row: number, col: number) => void;
  notifyDataChange: () => void;
}

/**
 * 统一的插入行操作处理函数
 *
 * 处理插入行的所有逻辑，包括历史记录、数据更新、状态管理等
 *
 * @param options - 处理选项
 * @param rowIndex - 要插入的行索引（在指定行下方插入）
 * @returns 是否成功处理
 */
export function handleInsertRowOperation(
  options: RowOperationHandlerOptions,
  rowIndex: number
): boolean {
  const { tableData, saveHistory, insertRowBelow, notifyDataChange } = options;

  if (typeof rowIndex !== "number" || rowIndex < 0) {
    return false;
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

  // 执行插入操作
  insertRowBelow(rowIndex);

  // 在下一个 tick 通知数据变化
  nextTick(() => {
    notifyDataChange();
  });

  return true;
}

/**
 * 统一的删除行操作处理函数
 *
 * 处理删除行的所有逻辑，包括历史记录、数据更新、活动单元格调整、状态管理等
 * 支持单行或多行删除
 *
 * @param options - 处理选项
 * @param rowIndexOrIndices - 要删除的行索引（单个数字）或行索引数组（多个数字）
 * @returns 是否成功处理
 */
export function handleDeleteRowOperation(
  options: RowOperationHandlerOptions,
  rowIndexOrIndices: number | number[]
): boolean {
  const {
    tableData,
    rows,
    columns,
    activeCell,
    saveHistory,
    deleteRow,
    startSingleSelection,
    notifyDataChange,
  } = options;

  // 处理多行删除
  if (Array.isArray(rowIndexOrIndices)) {
    return handleDeleteRowsOperation(options, rowIndexOrIndices);
  }

  // 处理单行删除
  if (typeof rowIndexOrIndices !== "number" || rowIndexOrIndices < 0) {
    return false;
  }

  const rowIndex = rowIndexOrIndices;

  // 验证行索引有效性
  if (rowIndex >= rows.value.length) {
    return false;
  }

  // 在删除之前，记录被删除行的所有单元格数据（包括空单元格）
  // 记录所有单元格确保空行也能正确恢复
  const changes: CellChange[] = [];
  const rowData = tableData.value[rowIndex] || [];
  const maxCols = Math.max(
    rowData.length,
    columns.value.length,
    ...tableData.value.map((row: string[]) => row?.length || 0)
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
  deleteRow(rowIndex);
  const newRowCount = rows.value.length;

  // 调整活动单元格位置
  if (activeCell?.value) {
    const currentRow = activeCell.value.row;
    const col = activeCell.value.col;
    const safeCol = Math.min(col, columns.value.length - 1);

    if (currentRow === rowIndex) {
      // 如果删除的是当前活动行
      if (rowIndex < newRowCount) {
        startSingleSelection(rowIndex, safeCol);
      } else {
        const newRow = Math.max(0, rowIndex - 1);
        startSingleSelection(newRow, safeCol);
      }
    } else if (currentRow > rowIndex) {
      // 如果当前活动行在删除行下方，需要上移
      const newRow = currentRow - 1;
      const safeRow = Math.min(newRow, newRowCount - 1);
      startSingleSelection(safeRow, safeCol);
    }
  }

  // 在下一个 tick 通知数据变化
  nextTick(() => {
    notifyDataChange();
  });

  return true;
}

/**
 * 统一的删除多行操作处理函数
 *
 * 处理删除多行的所有逻辑，包括历史记录、数据更新、活动单元格调整、状态管理等
 *
 * @param options - 处理选项
 * @param rowIndices - 要删除的行索引数组
 * @returns 是否成功处理
 */
export function handleDeleteRowsOperation(
  options: RowOperationHandlerOptions,
  rowIndices: number[]
): boolean {
  const {
    tableData,
    rows,
    columns,
    activeCell,
    saveHistory,
    deleteRow,
    startSingleSelection,
    notifyDataChange,
  } = options;

  if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
    return false;
  }

  // 验证并去重行索引
  const validIndices = Array.from(
    new Set(
      rowIndices.filter(
        (idx) => typeof idx === "number" && idx >= 0 && idx < rows.value.length
      )
    )
  );

  if (validIndices.length === 0) {
    return false;
  }

  // 在删除之前，记录被删除行的所有单元格数据（包括空单元格）
  // 记录所有单元格确保空行也能正确恢复
  const changes: CellChange[] = [];
  const maxCols = Math.max(
    ...tableData.value.map((row: string[]) => row?.length || 0),
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

  // 调整活动单元格位置
  if (activeCell?.value) {
    const currentRow = activeCell.value.row;
    const col = activeCell.value.col;
    const safeCol = Math.min(col, columns.value.length - 1);

    const isCurrentRowDeleted =
      currentRow >= minDeletedRow && currentRow <= maxDeletedRow;

    if (isCurrentRowDeleted) {
      // 如果当前活动行被删除，移动到第一个被删除行的位置
      const targetRow = Math.min(minDeletedRow, newRowCount - 1);
      if (targetRow >= 0) {
        startSingleSelection(targetRow, safeCol);
      } else if (newRowCount > 0) {
        startSingleSelection(0, safeCol);
      }
    } else if (currentRow > maxDeletedRow) {
      // 如果当前活动行在删除行下方，需要上移
      const deletedCount = oldRowCount - newRowCount;
      const newRow = currentRow - deletedCount;
      const safeRow = Math.min(newRow, newRowCount - 1);
      startSingleSelection(safeRow, safeCol);
    }
  }

  // 在下一个 tick 通知数据变化
  nextTick(() => {
    notifyDataChange();
  });

  return true;
}
