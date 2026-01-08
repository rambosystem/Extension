import { nextTick } from "vue";

/**
 * 单元格菜单管理 Composable
 *
 * 负责处理单元格菜单命令（删除行、插入行等）
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {import('vue').Ref} context.rows - 行索引数组
 * @param {import('vue').Ref} context.activeCell - 活动单元格
 * @param {import('vue').Ref} context.columns - 列标题数组
 * @param {Function} context.saveHistory - 保存历史记录
 * @param {Function} context.deleteRow - 删除行
 * @param {Function} context.insertRowBelow - 在下方插入行
 * @param {Function} context.setSelection - 设置选择
 * @param {Function} context.notifyDataChange - 通知数据变化
 * @returns {Object} 返回菜单命令处理方法
 */
export function useCellMenu({
  tableData,
  rows,
  activeCell,
  columns,
  saveHistory,
  deleteRow,
  insertRowBelow,
  setSelection,
  notifyDataChange,
}) {
  /**
   * 处理单元格菜单命令
   * @param {Object} command - 菜单命令对象 { action: string, rowIndex: number }
   */
  const handleCellMenuCommand = (command) => {
    if (!command || typeof command.rowIndex !== "number") {
      return;
    }

    const { action, rowIndex } = command;

    // 保存历史记录
    saveHistory(tableData.value);

    if (action === "deleteRow") {
      const oldRowCount = rows.value.length;
      deleteRow(rowIndex);
      const newRowCount = rows.value.length;

      // 删除行后，需要调整活动单元格
      if (activeCell.value) {
        if (activeCell.value.row === rowIndex) {
          // 如果删除的是当前行，移动到上一行（如果存在）
          const newRow = Math.max(0, rowIndex - 1);
          const col = activeCell.value.col;
          // 确保列索引不超出范围
          const safeCol = Math.min(col, columns.value.length - 1);
          setSelection(newRow, safeCol);
        } else if (activeCell.value.row > rowIndex) {
          // 如果删除的是当前行之前的行，行索引需要减1
          const newRow = activeCell.value.row - 1;
          const col = activeCell.value.col;
          // 确保列索引不超出范围
          const safeCol = Math.min(col, columns.value.length - 1);
          // 确保行索引不超出范围
          const safeRow = Math.min(newRow, newRowCount - 1);
          setSelection(safeRow, safeCol);
        }
        // 如果 activeCell.row < rowIndex，不需要调整
      }
    } else if (action === "insertRowBelow") {
      insertRowBelow(rowIndex);
      // 插入行后，活动单元格保持在原位置（新行在下方）
      // 如果需要移动到新插入的行，可以取消注释下面的代码
      // setSelection(rowIndex + 1, activeCell.value.col);
    }

    // 通知数据变化
    nextTick(() => {
      notifyDataChange();
    });
  };

  return {
    handleCellMenuCommand,
  };
}
