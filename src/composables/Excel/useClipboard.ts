import type { Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";
import { HistoryActionType, type SaveHistoryOptions } from "./useHistory";

/**
 * 复制上下文
 */
export interface CopyContext {
  isEditing: boolean;
  editingCell: CellPosition | null;
  activeCell: CellPosition | null;
  normalizedSelection: SelectionRange | null;
  multiSelections: SelectionRange[];
  tableData: string[][];
}

/**
 * 粘贴上下文
 */
export interface PasteContext {
  isEditing: boolean;
  editingCell: CellPosition | null;
  activeCell: CellPosition | null;
  normalizedSelection: SelectionRange | null;
  clipboardText: string;
  tableData: string[][];
}

/**
 * 粘贴结果
 */
export interface PasteResult {
  success: boolean;
  affectedRange: SelectionRange | null;
  rowsAdded: number;
  colsAdded: number;
  error?: string;
}

/**
 * 剪贴板操作接口（抽象层）
 */
export interface ClipboardOperations {
  copyToClipboard(text: string): Promise<void>;
  readFromClipboard(): Promise<string>;
  hasClipboardContent(): Promise<boolean>;
}

/**
 * 浏览器剪贴板操作实现
 */
export class BrowserClipboardOperations implements ClipboardOperations {
  async copyToClipboard(text: string): Promise<void> {
    try {
      // 优先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      // 降级方案：使用 document.execCommand
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const successful = document.execCommand("copy");
        if (!successful) {
          throw new Error("execCommand copy failed");
        }
      } finally {
        document.body.removeChild(textarea);
      }
    } catch (error) {
      throw new Error(`Failed to copy to clipboard: ${error}`);
    }
  }

  async readFromClipboard(): Promise<string> {
    try {
      // 优先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }

      // 无降级方案，抛出错误
      throw new Error("Clipboard API not available");
    } catch (error) {
      throw new Error(`Failed to read from clipboard: ${error}`);
    }
  }

  async hasClipboardContent(): Promise<boolean> {
    try {
      const text = await this.readFromClipboard();
      return text.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * 复制策略：确定复制什么内容
 */
class CopyStrategyManager {
  /**
   * 获取要复制的文本
   */
  getCopyText(context: CopyContext): string | null {
    // 1. 编辑模式：不复制（让浏览器原生处理输入框的复制）
    if (context.isEditing) {
      return null;
    }

    // 2. 多选区域：合并为一个大矩形复制
    if (context.multiSelections.length > 1) {
      return this.copyMultipleSelections(context);
    }

    // 3. 单选区域：标准矩形复制
    if (context.normalizedSelection) {
      return this.copyRectangularSelection(context);
    }

    // 4. 无选区：复制当前单元格
    if (context.activeCell) {
      return this.copySingleCell(context);
    }

    return null;
  }

  private copyRectangularSelection(context: CopyContext): string {
    const { normalizedSelection, tableData } = context;
    if (!normalizedSelection) return "";

    const rows: string[] = [];
    for (
      let r = normalizedSelection.minRow;
      r <= normalizedSelection.maxRow;
      r++
    ) {
      if (!tableData[r]) continue;

      const cells: string[] = [];
      for (
        let c = normalizedSelection.minCol;
        c <= normalizedSelection.maxCol;
        c++
      ) {
        cells.push(tableData[r]?.[c] ?? "");
      }
      rows.push(cells.join("\t"));
    }
    return rows.join("\n");
  }

  private copyMultipleSelections(context: CopyContext): string {
    // 找到所有选区的边界
    const { multiSelections, tableData } = context;

    const minRow = Math.min(...multiSelections.map((s) => s.minRow));
    const maxRow = Math.max(...multiSelections.map((s) => s.maxRow));
    const minCol = Math.min(...multiSelections.map((s) => s.minCol));
    const maxCol = Math.max(...multiSelections.map((s) => s.maxCol));

    // 创建一个大矩形，未选中的区域用空字符串填充
    const rows: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const cells: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        // 检查该单元格是否在任一选区内
        const isInSelection = multiSelections.some(
          (sel) =>
            r >= sel.minRow &&
            r <= sel.maxRow &&
            c >= sel.minCol &&
            c <= sel.maxCol
        );

        cells.push(isInSelection ? tableData[r]?.[c] ?? "" : "");
      }
      rows.push(cells.join("\t"));
    }
    return rows.join("\n");
  }

  private copySingleCell(context: CopyContext): string {
    const { activeCell, tableData } = context;
    if (!activeCell) return "";

    return tableData[activeCell.row]?.[activeCell.col] ?? "";
  }
}

/**
 * 粘贴策略：确定粘贴到哪里、如何粘贴
 */
class PasteStrategyManager {
  /**
   * 执行粘贴操作
   */
  executePaste(
    context: PasteContext,
    options: {
      rows: Ref<number[]>;
      columns: Ref<string[]>;
      generateColumnLabel: (index: number) => string;
      saveHistory: (state: any, options?: SaveHistoryOptions) => void;
      startSingleSelection: (row: number, col: number) => void;
      notifyDataChange?: () => void;
    }
  ): PasteResult {
    // 1. 编辑模式：不处理（让浏览器原生处理输入框的粘贴）
    if (context.isEditing) {
      return {
        success: false,
        affectedRange: null,
        rowsAdded: 0,
        colsAdded: 0,
        error: "Cannot paste while editing",
      };
    }

    // 2. 解析粘贴数据
    const pasteData = this.parsePasteData(context.clipboardText);
    if (pasteData.length === 0) {
      return {
        success: false,
        affectedRange: null,
        rowsAdded: 0,
        colsAdded: 0,
        error: "No data to paste",
      };
    }

    // 3. 确定粘贴起始位置
    const startRow = context.activeCell?.row ?? 0;
    const startCol = context.activeCell?.col ?? 0;

    // 4. 保存粘贴前的状态（用于历史记录比较）
    const beforePasteState = JSON.parse(JSON.stringify(context.tableData));

    // 5. 执行粘贴（扩展行列）
    const result = this.applyPasteData(
      pasteData,
      startRow,
      startCol,
      context.tableData,
      options
    );

    // 6. 保存历史记录（在粘贴完成后，使用修改后的状态）
    if (result.success) {
      // 检测粘贴引起的变化
      const changes: Array<{
        row: number;
        col: number;
        oldValue: string;
        newValue: string;
      }> = [];

      const endRow = startRow + pasteData.length - 1;
      const endCol =
        startCol + Math.max(...pasteData.map((row) => row.length)) - 1;

      // 检测所有被粘贴覆盖的单元格变化
      for (let r = startRow; r <= endRow; r++) {
        const rIndex = r - startRow;
        const rowData = pasteData[rIndex] || [];
        const rowBefore = beforePasteState[r] || [];

        for (let c = startCol; c <= endCol; c++) {
          const cIndex = c - startCol;
          const oldVal = rowBefore[c] ?? "";
          const newVal = rowData[cIndex] ?? "";

          // 记录所有变化（包括值相同的情况，因为这是粘贴操作）
          // 但为了优化，只记录实际有值变化的单元格
          if (oldVal !== newVal) {
            changes.push({
              row: r,
              col: c,
              oldValue: oldVal,
              newValue: newVal,
            });
          }
        }
      }

      options.saveHistory(context.tableData, {
        type: HistoryActionType.PASTE,
        description: `Paste ${pasteData.length}x${
          pasteData[0]?.length || 0
        } cells`,
        changes: changes.length > 0 ? changes : undefined,
      });
    }

    // 7. 更新选区（高亮粘贴区域）
    if (result.success && result.affectedRange) {
      options.startSingleSelection(
        result.affectedRange.minRow,
        result.affectedRange.minCol
      );

      // 触发数据同步
      if (options.notifyDataChange) {
        options.notifyDataChange();
      }
    }

    return result;
  }

  private parsePasteData(clipboardText: string): string[][] {
    if (!clipboardText || typeof clipboardText !== "string") {
      return [];
    }

    try {
      // 处理不同的换行符：\r\n (Windows), \n (Unix), \r (Mac)
      return clipboardText
        .split(/\r?\n/)
        .filter((row) => row !== "")
        .map((row) => row.split("\t"));
    } catch (error) {
      console.warn("Failed to parse paste data:", error);
      return [];
    }
  }

  private applyPasteData(
    pasteData: string[][],
    startRow: number,
    startCol: number,
    tableData: string[][],
    options: {
      rows: Ref<number[]>;
      columns: Ref<string[]>;
      generateColumnLabel: (index: number) => string;
    }
  ): PasteResult {
    let rowsAdded = 0;
    let colsAdded = 0;

    const endRow = startRow + pasteData.length - 1;
    const endCol =
      startCol + Math.max(...pasteData.map((row) => row.length)) - 1;

    // 扩展行
    if (endRow >= options.rows.value.length) {
      const currentLength = options.rows.value.length;
      for (let i = currentLength; i <= endRow; i++) {
        options.rows.value.push(i);
        tableData.push(
          Array.from({ length: options.columns.value.length }, () => "")
        );
        rowsAdded++;
      }
    }

    // 扩展列
    if (endCol >= options.columns.value.length) {
      const currentLength = options.columns.value.length;
      for (let i = currentLength; i <= endCol; i++) {
        options.columns.value.push(options.generateColumnLabel(i));
        colsAdded++;
      }
      // 为所有行补齐列
      tableData.forEach((rowData) => {
        while (rowData.length <= endCol) {
          rowData.push("");
        }
      });
    }

    // 执行粘贴
    pasteData.forEach((rowArr, rIndex) => {
      const r = startRow + rIndex;
      rowArr.forEach((cellVal, cIndex) => {
        const c = startCol + cIndex;
        if (tableData[r]) {
          tableData[r][c] = cellVal;
        }
      });
    });

    return {
      success: true,
      affectedRange: {
        minRow: startRow,
        maxRow: endRow,
        minCol: startCol,
        maxCol: endCol,
      },
      rowsAdded,
      colsAdded,
    };
  }
}

/**
 * useClipboard 选项
 */
export interface UseClipboardOptions {
  editingCell: Ref<CellPosition | null>;
  normalizedSelection: Ref<SelectionRange | null>;
  tableData: Ref<string[][]>;
  activeCell: Ref<CellPosition | null>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  multiSelections: Ref<SelectionRange[]>;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
  startSingleSelection: (row: number, col: number) => void;
  notifyDataChange?: () => void;
}

/**
 * useClipboard 返回值
 */
export interface UseClipboardReturn {
  handleCopy: (event: ClipboardEvent) => void;
  handlePaste: (event: ClipboardEvent) => void;
  copyToClipboard: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  hasClipboardContent: () => Promise<boolean>;
}

/**
 * 剪贴板管理 Composable（重构版本）
 */
export function useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  activeCell,
  rows,
  columns,
  multiSelections,
  saveHistory,
  startSingleSelection,
  notifyDataChange,
}: UseClipboardOptions): UseClipboardReturn {
  // 初始化操作适配器和策略管理器
  const clipboardOps = new BrowserClipboardOperations();
  const copyStrategy = new CopyStrategyManager();
  const pasteStrategy = new PasteStrategyManager();

  // 生成列标题的辅助函数
  const generateColumnLabel = (index: number): string => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  /**
   * 处理复制操作（事件驱动）
   */
  const handleCopy = (event: ClipboardEvent): void => {
    const context: CopyContext = {
      isEditing: !!editingCell.value,
      editingCell: editingCell.value,
      activeCell: activeCell.value,
      normalizedSelection: normalizedSelection.value,
      multiSelections: multiSelections.value,
      tableData: tableData.value,
    };

    const textToCopy = copyStrategy.getCopyText(context);

    // 如果返回 null，说明应该让浏览器原生处理（如：编辑模式）
    if (textToCopy === null) {
      return;
    }

    // 阻止默认行为，使用自定义逻辑
    event.preventDefault();

    try {
      if (event.clipboardData) {
        event.clipboardData.setData("text/plain", textToCopy);
      } else {
        // 降级方案：异步复制
        clipboardOps.copyToClipboard(textToCopy).catch((error) => {
          console.error("Failed to copy to clipboard:", error);
        });
      }
    } catch (error) {
      console.error("Copy operation failed:", error);
    }
  };

  /**
   * 程序化复制（菜单、快捷键触发）
   */
  const copyToClipboard = async (): Promise<boolean> => {
    const context: CopyContext = {
      isEditing: !!editingCell.value,
      editingCell: editingCell.value,
      activeCell: activeCell.value,
      normalizedSelection: normalizedSelection.value,
      multiSelections: multiSelections.value,
      tableData: tableData.value,
    };

    const textToCopy = copyStrategy.getCopyText(context);

    if (textToCopy === null || textToCopy === "") {
      return false;
    }

    try {
      await clipboardOps.copyToClipboard(textToCopy);
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  };

  /**
   * 处理粘贴操作（事件驱动）
   */
  const handlePaste = (event: ClipboardEvent): void => {
    const context: PasteContext = {
      isEditing: !!editingCell.value,
      editingCell: editingCell.value,
      activeCell: activeCell.value,
      normalizedSelection: normalizedSelection.value,
      clipboardText: event.clipboardData?.getData("text") || "",
      tableData: tableData.value,
    };

    // 如果是编辑模式，让浏览器原生处理
    if (context.isEditing) {
      return;
    }

    event.preventDefault();

    const result = pasteStrategy.executePaste(context, {
      rows,
      columns,
      generateColumnLabel,
      saveHistory,
      startSingleSelection,
      notifyDataChange,
    });

    if (!result.success) {
      console.warn("Paste failed:", result.error);
    }
  };

  /**
   * 程序化粘贴（菜单、快捷键触发）
   */
  const pasteFromClipboard = async (): Promise<boolean> => {
    try {
      const clipboardText = await clipboardOps.readFromClipboard();

      const context: PasteContext = {
        isEditing: !!editingCell.value,
        editingCell: editingCell.value,
        activeCell: activeCell.value,
        normalizedSelection: normalizedSelection.value,
        clipboardText,
        tableData: tableData.value,
      };

      const result = pasteStrategy.executePaste(context, {
        rows,
        columns,
        generateColumnLabel,
        saveHistory,
        startSingleSelection,
        notifyDataChange,
      });

      return result.success;
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      return false;
    }
  };

  /**
   * 检查剪贴板是否有内容
   */
  const hasClipboardContent = async (): Promise<boolean> => {
    return await clipboardOps.hasClipboardContent();
  };

  return {
    handleCopy,
    handlePaste,
    copyToClipboard,
    pasteFromClipboard,
    hasClipboardContent,
  };
}
