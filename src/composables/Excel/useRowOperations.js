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
   * 统一的删除行处理函数
   * 删除指定行，并处理历史记录、数据同步和活动单元格调整
   *
   * 优化：删除行时，活动单元格保持在原位置，除非下面没有行了
   *
   * @param {number} rowIndex - 要删除的行索引
   */
  const handleDeleteRow = (rowIndex) => {
    if (typeof rowIndex !== "number" || rowIndex < 0) {
      return;
    }

    // 保存历史记录
    saveHistory(tableData.value);

    const oldRowCount = rows.value.length;
    deleteRow(rowIndex);
    const newRowCount = rows.value.length;

    // 删除行后，调整活动单元格
    if (activeCell.value) {
      const currentRow = activeCell.value.row;
      const col = activeCell.value.col;
      const safeCol = Math.min(col, columns.value.length - 1);

      if (currentRow === rowIndex) {
        // 如果删除的是当前行
        if (rowIndex < newRowCount) {
          // 下面还有行，保持在原位置（删除后，原来的下一行会移动到当前位置）
          setSelection(rowIndex, safeCol);
        } else {
          // 下面没有行了，移动到上一行（如果存在）
          const newRow = Math.max(0, rowIndex - 1);
          setSelection(newRow, safeCol);
        }
      } else if (currentRow > rowIndex) {
        // 如果删除的是当前行之前的行，行索引需要减1
        const newRow = currentRow - 1;
        const safeRow = Math.min(newRow, newRowCount - 1);
        setSelection(safeRow, safeCol);
      }
      // 如果 currentRow < rowIndex，不需要调整（删除的是后面的行）
    }

    // 通知数据变化
    nextTick(() => {
      notifyDataChange();
    });
  };

  return {
    handleInsertRowBelow,
    handleDeleteRow,
  };
}
