/**
 * 单元格菜单管理 Composable
 *
 * 负责处理单元格菜单命令（删除行、插入行等）
 * 使用统一的行动作处理函数
 *
 * @param {Object} context - 上下文对象
 * @param {Function} context.handleInsertRowBelow - 统一的插入行处理函数
 * @param {Function} context.handleDeleteRow - 统一的删除行处理函数
 * @returns {Object} 返回菜单命令处理方法
 */
export function useCellMenu({ handleInsertRowBelow, handleDeleteRow }) {
  /**
   * 处理单元格菜单命令
   * @param {Object} command - 菜单命令对象 { action: string, rowIndex: number }
   */
  const handleCellMenuCommand = (command) => {
    if (!command || typeof command.rowIndex !== "number") {
      return;
    }

    const { action, rowIndex } = command;

    if (action === "deleteRow") {
      handleDeleteRow(rowIndex);
    } else if (action === "insertRowBelow") {
      handleInsertRowBelow(rowIndex);
    }
  };

  return {
    handleCellMenuCommand,
  };
}
