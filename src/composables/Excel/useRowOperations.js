import { nextTick } from "vue";

/**
 * 行操作管理 Composable
 *
 * 负责处理行操作（插入行、删除行等）的统一逻辑
 * 提供统一的接口供菜单、键盘快捷键等使用
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {import('vue').Ref} context.rows - 行索引数组
 * @param {import('vue').Ref} context.activeCell - 活动单元格
 * @param {import('vue').Ref} context.columns - 列标题数组
 * @param {Function} context.saveHistory - 保存历史记录
 * @param {Function} context.insertRowBelow - 在下方插入行（底层函数）
 * @param {Function} context.deleteRow - 删除行（底层函数）
 * @param {Function} context.setSelection - 设置选择
 * @param {Function} context.notifyDataChange - 通知数据变化
 * @param {Function} context.onAfterDeleteRow - 删除行后的回调函数（可选）
 * @returns {Object} 返回行操作方法
 */
export function useRowOperations({
  tableData,
  rows,
  activeCell,
  columns,
  saveHistory,
  insertRowBelow,
  deleteRow,
  setSelection,
  notifyDataChange,
  onAfterDeleteRow,
}) {
  /**
   * 统一的插入行处理函数
   * 在指定行下方插入一行，并处理历史记录和数据同步
   *
   * @param {number} rowIndex - 在哪个行索引下方插入
   */
  const handleInsertRowBelow = (rowIndex) => {
    if (typeof rowIndex !== "number" || rowIndex < 0) {
      return;
    }

    // 保存历史记录
    saveHistory(tableData.value);

    // 插入行
    insertRowBelow(rowIndex);

    // 插入行后，活动单元格保持在原位置（新行在下方）
    // 如果需要移动到新插入的行，可以取消注释下面的代码
    // if (activeCell.value) {
    //   setSelection(rowIndex + 1, activeCell.value.col);
    // }

    // 通知数据变化
    nextTick(() => {
      notifyDataChange();
    });
  };

  /**
   * 统一的删除多行处理函数
   * 删除指定的多行，并处理历史记录、数据同步和活动单元格调整
   *
   * 优化：从后往前删除，避免索引变化问题
   *
   * @param {number[]} rowIndices - 要删除的行索引数组（会自动去重和排序）
   */
  const handleDeleteRows = (rowIndices) => {
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
      return;
    }

    // 过滤有效索引并去重
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

    // 保存历史记录
    saveHistory(tableData.value);

    const oldRowCount = rows.value.length;
    const minDeletedRow = Math.min(...validIndices);
    const maxDeletedRow = Math.max(...validIndices);

    // 从后往前删除，避免索引变化问题
    const sortedIndices = [...validIndices].sort((a, b) => b - a);
    for (const rowIndex of sortedIndices) {
      deleteRow(rowIndex);
    }

    const newRowCount = rows.value.length;

    // 删除行后，调整活动单元格
    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      // 检查当前活动单元格是否在删除范围内
      const isCurrentRowDeleted =
        currentRow >= minDeletedRow && currentRow <= maxDeletedRow;

      if (isCurrentRowDeleted) {
        // 如果删除的行包含当前行
        const deletedCount = oldRowCount - newRowCount;
        // 尝试移动到删除范围的第一行位置（如果还存在）
        const targetRow = Math.min(minDeletedRow, newRowCount - 1);
        if (targetRow >= 0) {
          setSelection(targetRow, safeCol);
        } else if (newRowCount > 0) {
          // 如果所有行都被删除了，移动到第一行
          setSelection(0, safeCol);
        }
      } else if (currentRow > maxDeletedRow) {
        // 如果当前行在删除范围之后，需要向上移动（删除的行数）
        const deletedCount = oldRowCount - newRowCount;
        const newRow = currentRow - deletedCount;
        const safeRow = Math.min(newRow, newRowCount - 1);
        setSelection(safeRow, safeCol);
      }
      // 如果 currentRow < minDeletedRow，不需要调整（删除的是后面的行）
    }

    // 通知数据变化
    nextTick(() => {
      notifyDataChange();
      // 调用删除后的回调（如果提供）
      if (onAfterDeleteRow && typeof onAfterDeleteRow === "function") {
        onAfterDeleteRow();
      }
    });
  };

  /**
   * 统一的删除行处理函数
   * 删除指定行，并处理历史记录、数据同步和活动单元格调整
   *
   * 优化：删除行时，活动单元格保持在原位置，除非下面没有行了
   * 支持单行删除（向后兼容）和多行删除
   *
   * @param {number|number[]} rowIndexOrIndices - 要删除的行索引（单个数字）或行索引数组
   */
  const handleDeleteRow = (rowIndexOrIndices) => {
    // 如果传入的是数组，使用多行删除函数
    if (Array.isArray(rowIndexOrIndices)) {
      handleDeleteRows(rowIndexOrIndices);
      return;
    }

    // 向后兼容：单行删除
    if (typeof rowIndexOrIndices !== "number" || rowIndexOrIndices < 0) {
      return;
    }

    // 保存历史记录
    saveHistory(tableData.value);

    const oldRowCount = rows.value.length;
    deleteRow(rowIndexOrIndices);
    const newRowCount = rows.value.length;

    // 删除行后，调整活动单元格
    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      if (currentRow === rowIndexOrIndices) {
        // 如果删除的是当前行
        if (rowIndexOrIndices < newRowCount) {
          // 下面还有行，保持在原位置（删除后，原来的下一行会移动到当前位置）
          setSelection(rowIndexOrIndices, safeCol);
        } else {
          // 下面没有行了，移动到上一行（如果存在）
          const newRow = Math.max(0, rowIndexOrIndices - 1);
          setSelection(newRow, safeCol);
        }
      } else if (currentRow > rowIndexOrIndices) {
        // 如果删除的是当前行之前的行，行索引需要减1
        const newRow = currentRow - 1;
        const safeRow = Math.min(newRow, newRowCount - 1);
        setSelection(safeRow, safeCol);
      }
      // 如果 currentRow < rowIndexOrIndices，不需要调整（删除的是后面的行）
    }

    // 通知数据变化
    nextTick(() => {
      notifyDataChange();
      // 调用删除后的回调（如果提供）
      if (onAfterDeleteRow && typeof onAfterDeleteRow === "function") {
        onAfterDeleteRow();
      }
    });
  };

  return {
    handleInsertRowBelow,
    handleDeleteRow,
    handleDeleteRows,
  };
}
