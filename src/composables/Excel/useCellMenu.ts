/**
 * 单元格菜单命令
 */
export interface CellMenuCommand {
  action: string;
  rowIndex: number;
}

/**
 * useCellMenu 选项
 */
export interface UseCellMenuOptions {
  handleInsertRowBelow: (rowIndex: number) => void;
  handleDeleteRow: (rowIndex: number) => void;
}

/**
 * useCellMenu 返回值
 */
export interface UseCellMenuReturn {
  handleCellMenuCommand: (command: CellMenuCommand) => void;
}

/**
 * 单元格菜单管理 Composable
 *
 * 负责处理单元格菜单命令（删除行、插入行等）
 * 使用统一的行动作处理函数
 */
export function useCellMenu({
  handleInsertRowBelow,
  handleDeleteRow,
}: UseCellMenuOptions): UseCellMenuReturn {
  /**
   * 处理单元格菜单命令
   */
  const handleCellMenuCommand = (command: CellMenuCommand): void => {
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
