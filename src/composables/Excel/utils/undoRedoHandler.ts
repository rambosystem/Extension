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
  result: { state: string[][]; metadata?: Record<string, any> } | null;
  tableData: { value: string[][] };
  rows: { value: number[] };
  columns: { value: string[] };
  activeCell?: { value: ActiveCell | null } | null;
  clearSelection?: () => void;
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

  // 验证并调整 activeCell 位置，确保它在有效范围内
  if (activeCell?.value) {
    const maxRows = validatedState.length;
    const maxCols = validatedState[0]?.length || 0;

    if (activeCell.value.row >= maxRows || activeCell.value.col >= maxCols) {
      // 如果当前活动单元格超出范围，移动到最后一个有效单元格
      activeCell.value = {
        row: Math.max(0, Math.min(activeCell.value.row, maxRows - 1)),
        col: Math.max(0, Math.min(activeCell.value.col, maxCols - 1)),
      };
    }
  }

  // 清除选择状态（统一处理，确保快捷键和菜单行为一致）
  if (clearSelection) {
    clearSelection();
  }

  // 通知数据变化（统一处理，确保快捷键和菜单行为一致）
  if (notifyDataChange) {
    notifyDataChange();
  }

  return true;
}
