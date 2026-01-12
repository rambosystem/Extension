import { type Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";
import { handleUndoRedoOperation } from "../utils/undoRedoHandler";
import {
  handleInsertRowOperation,
  handleDeleteRowOperation,
  type RowOperationHandlerOptions,
} from "./rowColumnOps/rowOperationHandler";
import type { SaveHistoryOptions } from "./history/useHistory";
import type { SelectionService } from "./selection/selectionService";

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
  copyToClipboard: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  undoHistory: () => any | null;
  redoHistory: () => any | null;
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  activeCell?: Ref<CellPosition | null> | null;
  normalizedSelection?: Ref<SelectionRange | null> | null;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
  insertRowBelow: (rowIndex: number) => void;
  deleteRow: (rowIndex: number) => void;
  selectionService: SelectionService;
  triggerSelectionFlash?: () => void;
  notifyDataChange?: () => void;
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
 * 使用统一的程序化复制粘贴接口和行操作工具函数
 */
export function useCellMenu({
  copyToClipboard,
  pasteFromClipboard,
  undoHistory,
  redoHistory,
  tableData,
  rows,
  columns,
  activeCell,
  normalizedSelection,
  saveHistory,
  insertRowBelow,
  deleteRow,
  selectionService,
  triggerSelectionFlash,
  notifyDataChange,
}: UseCellMenuOptions): UseCellMenuReturn {
  // 准备行操作工具函数的选项
  const rowOperationOptions: RowOperationHandlerOptions = {
    tableData,
    rows,
    columns,
    activeCell,
    saveHistory,
    insertRowBelow,
    deleteRow,
    selectionService,
    notifyDataChange: notifyDataChange || (() => {}),
  };

  /**
   * 处理单元格菜单命令
   */
  const handleCellMenuCommand = (command: CellMenuCommand): void => {
    if (!command || typeof command.rowIndex !== "number") {
      return;
    }

    const { action, rowIndex } = command;

    if (action === "deleteRow") {
      // 检查是否有选区，如果有选区且是多行，删除选中的所有行
      const selection = normalizedSelection?.value;
      if (selection && selection.minRow !== selection.maxRow) {
        // 多行删除：删除选中的所有行
        const rowIndices: number[] = [];
        for (let row = selection.minRow; row <= selection.maxRow; row++) {
          rowIndices.push(row);
        }
        handleDeleteRowOperation(rowOperationOptions, rowIndices);
      } else {
        // 单行删除：删除指定行
        handleDeleteRowOperation(rowOperationOptions, rowIndex);
      }
    } else if (action === "insertRowBelow") {
      handleInsertRowOperation(rowOperationOptions, rowIndex);
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
      const result = undoHistory();
      // 使用公共函数处理撤销操作（与快捷键逻辑保持一致，公共函数内部会处理更新选区和通知数据变化）
      handleUndoRedoOperation({
        result,
        tableData,
        rows,
        columns,
        activeCell,
        selectionService,
        triggerSelectionFlash,
        notifyDataChange,
      });
    } else if (action === "redo") {
      const result = redoHistory();
      // 使用公共函数处理重做操作（与快捷键逻辑保持一致，公共函数内部会处理更新选区和通知数据变化）
      handleUndoRedoOperation({
        result,
        tableData,
        rows,
        columns,
        activeCell,
        selectionService,
        triggerSelectionFlash,
        notifyDataChange,
      });
    }
  };

  return {
    handleCellMenuCommand,
  };
}
