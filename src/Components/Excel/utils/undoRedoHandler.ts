/**
 * 生成列标签（A, B, C, ..., Z, AA, AB, ...）
 */
const generateColumnLabel = (index: number): string => {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = Math.floor((index - 26) / 26);
  const second = (index - 26) % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
};

/**
 * 活动单元格类型
 */
export interface ActiveCell {
  row: number;
  col: number;
}

/**
 * 撤销/重做处理选项
 */
export interface UndoRedoHandlerOptions {
  result:
    | { state: string[][]; metadata?: Record<string, any>; changes?: any[] }
    | null;
  tableData: { value: string[][] };
  rows: { value: number[] };
  columns: { value: string[] };
  activeCell?: { value: ActiveCell | null } | null;
  clearSelection?: () => void;
  startSingleSelection?: (row: number, col: number) => void;
  updateSingleSelectionEnd?: (row: number, col: number) => void;
  notifyDataChange?: () => void;
}

/**
 * 处理撤销/重做操作的公共函数
 *
 * 统一处理撤销/重做后的状态验证、数据更新和行列调整
 *
 * @param options - 处理选项
 * @returns 是否成功处理
 */
export function handleUndoRedoOperation(
  options: UndoRedoHandlerOptions
): boolean {
  const {
    result,
    tableData,
    rows,
    columns,
    activeCell,
    clearSelection,
    startSingleSelection,
    updateSingleSelectionEnd,
    notifyDataChange,
  } = options;

  // 如果无法撤销/重做，返回 false
  if (!result || !result.state || !Array.isArray(result.state)) {
    return false;
  }

  // 验证状态的有效性
  const validatedState = result.state.map((row: any) => {
    if (row === null || row === undefined) {
      return [];
    }
    if (Array.isArray(row)) {
      return row.map((cell: any) => String(cell ?? ""));
    }
    return [];
  });

  // 确保至少有一行
  if (validatedState.length === 0) {
    validatedState.push([]);
  }

  // 更新表格数据
  tableData.value = validatedState;

  // 始终使用 tableData 的实际大小来调整行列
  const targetRowCount = validatedState.length;
  const targetColCount = Math.max(
    ...validatedState.map((row: string[]) => row.length),
    1
  );

  // 调整行数量
  if (rows.value.length !== targetRowCount) {
    if (rows.value.length > targetRowCount) {
      rows.value = rows.value.slice(0, targetRowCount);
    } else {
      while (rows.value.length < targetRowCount) {
        rows.value.push(rows.value.length);
      }
    }
  }

  // 调整列数量
  if (columns.value.length !== targetColCount) {
    if (columns.value.length > targetColCount) {
      columns.value = columns.value.slice(0, targetColCount);
    } else {
      while (columns.value.length < targetColCount) {
        columns.value.push(generateColumnLabel(columns.value.length));
      }
    }
  }

  const maxRows = validatedState.length;
  const maxCols = Math.max(...validatedState.map((row) => row.length), 1);

  const applyChangeSelection = (): boolean => {
    if (startSingleSelection && updateSingleSelectionEnd) {
      const meta = result?.metadata || {};
      if (typeof meta.insertedRowIndex === "number") {
        const row = Math.max(0, Math.min(meta.insertedRowIndex, maxRows - 1));
        if (activeCell?.value) {
          activeCell.value = { row, col: 0 };
        }
        startSingleSelection(row, 0);
        updateSingleSelectionEnd(row, Math.max(0, maxCols - 1));
        return true;
      }

      if (Array.isArray(meta.deletedRowIndices) && meta.deletedRowIndices.length > 0) {
        const minDeleted = Math.min(...meta.deletedRowIndices);
        const row = Math.max(0, Math.min(minDeleted, maxRows - 1));
        if (activeCell?.value) {
          activeCell.value = { row, col: 0 };
        }
        startSingleSelection(row, 0);
        updateSingleSelectionEnd(row, Math.max(0, maxCols - 1));
        return true;
      }
    }

    if (
      !result?.changes ||
      !Array.isArray(result.changes) ||
      result.changes.length === 0 ||
      !startSingleSelection ||
      !updateSingleSelectionEnd
    ) {
      return false;
    }

    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;

    result.changes.forEach((change: any) => {
      if (
        typeof change?.row !== "number" ||
        typeof change?.col !== "number"
      ) {
        return;
      }
      minRow = Math.min(minRow, change.row);
      maxRow = Math.max(maxRow, change.row);
      minCol = Math.min(minCol, change.col);
      maxCol = Math.max(maxCol, change.col);
    });

    if (
      !Number.isFinite(minRow) ||
      !Number.isFinite(maxRow) ||
      !Number.isFinite(minCol) ||
      !Number.isFinite(maxCol)
    ) {
      return false;
    }

    const safeMinRow = Math.max(0, Math.min(minRow, maxRows - 1));
    const safeMaxRow = Math.max(0, Math.min(maxRow, maxRows - 1));
    const safeMinCol = Math.max(0, Math.min(minCol, maxCols - 1));
    const safeMaxCol = Math.max(0, Math.min(maxCol, maxCols - 1));

    if (activeCell?.value) {
      activeCell.value = {
        row: safeMinRow,
        col: safeMinCol,
      };
    }

    startSingleSelection(safeMinRow, safeMinCol);
    updateSingleSelectionEnd(safeMaxRow, safeMaxCol);
    return true;
  };

  if (!applyChangeSelection()) {
    // 验证并调整 activeCell 位置，确保它在有效范围内
    if (activeCell?.value) {
      // 确保 activeCell 在有效范围内
      const validRow = Math.max(0, Math.min(activeCell.value.row, maxRows - 1));
      const validCol = Math.max(0, Math.min(activeCell.value.col, maxCols - 1));

      // 如果位置发生变化，更新 activeCell
      if (
        activeCell.value.row !== validRow ||
        activeCell.value.col !== validCol
      ) {
        activeCell.value = {
          row: validRow,
          col: validCol,
        };
      }

      // 更新选区到 activeCell 的位置（而不是清除选区）
      if (startSingleSelection) {
        startSingleSelection(activeCell.value.row, activeCell.value.col);
      } else if (clearSelection) {
        // 如果没有 startSingleSelection，回退到清除选择
        clearSelection();
      }
    } else {
      // 如果没有 activeCell，清除选择状态
      if (clearSelection) {
        clearSelection();
      }
    }
  }

  // 使用 setTimeout 延迟调用 notifyDataChange()，确保在状态更新完成后再通知
  // 注意：isUndoRedoInProgress 会在 undo/redo 函数中延迟重置（10ms）
  // 这里使用较短的延迟（5ms），确保在 isUndoRedoInProgress 重置前执行
  // 这样 useDataSync 的 watch 在检查 isUndoRedoInProgress 时仍会跳过，避免重复通知
  if (notifyDataChange) {
    setTimeout(() => {
      notifyDataChange();
    }, 5);
  }

  return true;
}
