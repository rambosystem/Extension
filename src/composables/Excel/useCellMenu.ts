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
  copyToClipboard: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  undoHistory: () => any | null;
  redoHistory: () => any | null;
  tableData: any;
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
 * 负责处理单元格菜单命令（删除行、插入行、复制、粘贴、撤销、重做等）
 * 使用统一的程序化复制粘贴接口
 */
export function useCellMenu({
  handleInsertRowBelow,
  handleDeleteRow,
  copyToClipboard,
  pasteFromClipboard,
  undoHistory,
  redoHistory,
  tableData,
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
    } else if (action === "copy") {
      // 使用程序化复制
      copyToClipboard().catch((error) => {
        console.error("Menu copy failed:", error);
      });
    } else if (action === "paste") {
      // 使用程序化粘贴
      pasteFromClipboard().catch((error) => {
        console.error("Menu paste failed:", error);
      });
    } else if (action === "undo") {
      const newState = undoHistory();
      if (newState && Array.isArray(newState)) {
        tableData.value = newState;
      }
    } else if (action === "redo") {
      const newState = redoHistory();
      if (newState && Array.isArray(newState)) {
        tableData.value = newState;
      }
    }
  };

  return {
    handleCellMenuCommand,
  };
}
