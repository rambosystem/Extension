import { ref, type Ref } from "vue";
import type { CellPosition, SelectionRange } from "../types";
import {
  HistoryActionType,
  type SaveHistoryOptions,
} from "../history/useHistory";
import type { ExcelState } from "../useExcelState";
import { getCopyText, parseClipboardText } from "./clipboardParser";
import type { SelectionService } from "../selection/selectionService";

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
  changes?: Array<{
    row: number;
    col: number;
    oldValue: string;
    newValue: string;
  }>;
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
      selectionService: SelectionService;
      isCellEditable?: (row: number, col: number) => boolean;
      emitSync?: () => void;
      skipHistorySave?: boolean; // 跳过历史记录保存（用于剪切-粘贴原子操作）
      sourceRange?: SelectionRange | null; // 复制/剪切源区域（用于撤回时恢复选区）
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
    const pasteData = parseClipboardText(context.clipboardText);
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

    // 6. 检测粘贴引起的变化并保存历史记录（在粘贴完成后，使用修改后的状态）
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
          if (options.isCellEditable && !options.isCellEditable(r, c)) {
            continue;
          }

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

      // 将变化信息添加到结果中
      result.changes = changes;

      // 只有在不跳过历史记录保存时才保存（剪切-粘贴时会跳过，统一保存）
      if (!options.skipHistorySave) {
        options.saveHistory(context.tableData, {
          type: HistoryActionType.PASTE,
          description: `Paste ${pasteData.length}x${
            pasteData[0]?.length || 0
          } cells`,
          changes: changes.length > 0 ? changes : undefined,
          metadata: {
            // 撤回时选区应该回到复制源区域（如果有的话）
            selectionRange:
              options.sourceRange || (result.affectedRange ?? undefined),
            // 重做时选区应该回到粘贴目标区域
            redoSelectionRange: result.affectedRange ?? undefined,
          },
        });
      }
    }

    // 7. 更新选区（选中整个粘贴区域）
    if (result.success && result.affectedRange) {
      // 从粘贴区域的左上角开始选择
      options.selectionService.startSingleSelection(
        result.affectedRange.minRow,
        result.affectedRange.minCol
      );
      // 扩展到粘贴区域的右下角，选中整个粘贴区域
      options.selectionService.updateSingleSelectionEnd(
        result.affectedRange.maxRow,
        result.affectedRange.maxCol
      );

      // 触发数据同步
      options.emitSync?.();
    }

    return result;
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
      isCellEditable?: (row: number, col: number) => boolean;
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
    // 确保空单元格也能替换原有值
    pasteData.forEach((rowArr, rIndex) => {
      const r = startRow + rIndex;
      // 确保行存在
      if (!tableData[r]) {
        tableData[r] = [];
      }
      rowArr.forEach((cellVal, cIndex) => {
        const c = startCol + cIndex;
        if (options.isCellEditable && !options.isCellEditable(r, c)) {
          return;
        }
        // 确保列存在
        if (!tableData[r][c] && tableData[r][c] !== "") {
          // 如果列不存在，需要扩展
          while (tableData[r].length <= c) {
            tableData[r].push("");
          }
        }
        // 直接赋值，包括空字符串（空单元格也要替换原有值）
        tableData[r][c] = cellVal;
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
  /**
   * 统一状态管理（必需）
   * 使用统一状态管理，不再使用独立参数
   */
  state: ExcelState;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
  selectionService: SelectionService;
  isCellEditable?: (row: number, col: number) => boolean;
  emitSync?: () => void;
}

/**
 * useClipboard 返回值
 */
export interface UseClipboardReturn {
  handleCopy: (event: ClipboardEvent) => void;
  handlePaste: (event: ClipboardEvent) => void;
  copyToClipboard: () => Promise<boolean>;
  cutToClipboard: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  hasClipboardContent: () => Promise<boolean>;
  copiedRange: Ref<SelectionRange | null>;
  exitCopyMode: () => void;
}

/**
 * 剪贴板管理 Composable
 *
 * 使用统一状态管理，提供剪贴板操作方法
 *
 * 使用方式：
 * ```typescript
 * const excelState = useExcelState();
 * const clipboard = useClipboard({
 *   state: excelState,
 *   saveHistory,
 *   selectionService,
 *   isCellEditable,
 *   emitSync,
 * });
 * ```
 */
export function useClipboard({
  state,
  saveHistory,
  selectionService,
  isCellEditable,
  emitSync,
}: UseClipboardOptions): UseClipboardReturn {
  const {
    editing: { editingCell: actualEditingCell },
    selection: {
      normalizedSelection: actualNormalizedSelection,
      activeCell: actualActiveCell,
      multiSelections: actualMultiSelections,
    },
    data: {
      tableData: actualTableData,
      rows: actualRows,
      columns: actualColumns,
    },
  } = state;

  // 初始化操作适配器和策略管理器
  const clipboardOps = new BrowserClipboardOperations();
  const pasteStrategy = new PasteStrategyManager();

  // 复制状态管理：保存复制时的选区范围（复制源区域）
  const copiedRange = ref<SelectionRange | null>(null);
  const cutRange = ref<SelectionRange | null>(null);

  // 退出复制状态
  const exitCopyMode = (): void => {
    copiedRange.value = null;
    cutRange.value = null;
  };

  // 生成列标题的辅助函数（从统一状态获取）
  const generateColumnLabel = (index: number): string => {
    // 如果列已存在，直接返回
    if (index < actualColumns.value.length) {
      return actualColumns.value[index];
    }
    // 否则生成新的列标题
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  const recordCutRange = (context: CopyContext): void => {
    if (context.normalizedSelection) {
      cutRange.value = { ...context.normalizedSelection };
    } else if (context.activeCell) {
      cutRange.value = {
        minRow: context.activeCell.row,
        maxRow: context.activeCell.row,
        minCol: context.activeCell.col,
        maxCol: context.activeCell.col,
      };
    } else {
      cutRange.value = null;
    }
    copiedRange.value = cutRange.value ? { ...cutRange.value } : null;
  };

  const clearRange = (
    range: SelectionRange
  ): Array<{
    row: number;
    col: number;
    oldValue: string;
    newValue: string;
  }> => {
    const changes: Array<{
      row: number;
      col: number;
      oldValue: string;
      newValue: string;
    }> = [];

    for (let r = range.minRow; r <= range.maxRow; r++) {
      if (!actualTableData.value[r]) continue;
      for (let c = range.minCol; c <= range.maxCol; c++) {
        if (actualTableData.value[r][c] === undefined) {
          continue;
        }
        const oldValue = actualTableData.value[r]?.[c] ?? "";
        if (oldValue !== "") {
          changes.push({
            row: r,
            col: c,
            oldValue,
            newValue: "",
          });
        }
        actualTableData.value[r][c] = "";
      }
    }

    return changes;
  };

  const isRangeOverlap = (
    source: SelectionRange,
    target: SelectionRange
  ): boolean => {
    const rowOverlap =
      source.minRow <= target.maxRow && source.maxRow >= target.minRow;
    const colOverlap =
      source.minCol <= target.maxCol && source.maxCol >= target.minCol;
    return rowOverlap && colOverlap;
  };

  const clearCutSourceIfNeeded = (
    result: PasteResult,
    pasteChanges: Array<{
      row: number;
      col: number;
      oldValue: string;
      newValue: string;
    }>
  ): void => {
    if (!cutRange.value) {
      return;
    }

    if (
      result.affectedRange &&
      isRangeOverlap(cutRange.value, result.affectedRange)
    ) {
      cutRange.value = null;
      copiedRange.value = null;
      return;
    }

    const cutChanges = clearRange(cutRange.value);

    // 将剪切源的清除和粘贴操作合并为一条历史记录
    if (cutChanges.length > 0 || pasteChanges.length > 0) {
      // 合并粘贴变化和剪切源清除变化
      const allChanges = [...pasteChanges, ...cutChanges];

      saveHistory(actualTableData.value, {
        type: HistoryActionType.PASTE,
        description: `Cut and paste ${pasteChanges.length} cell(s)`,
        changes: allChanges.length > 0 ? allChanges : undefined,
        metadata: {
          isCutPaste: true,
          pasteRange: result.affectedRange,
          cutRange: cutRange.value,
          // 撤回时选区应该回到剪切源区域
          selectionRange: cutRange.value ?? undefined,
          // 重做时选区应该回到粘贴目标区域
          redoSelectionRange: result.affectedRange ?? undefined,
        },
      });

      emitSync?.();
    }

    cutRange.value = null;
    copiedRange.value = null;
  };

  const cutToClipboard = async (): Promise<boolean> => {
    const context: CopyContext = {
      isEditing: !!actualEditingCell.value,
      editingCell: actualEditingCell.value,
      activeCell: actualActiveCell.value,
      normalizedSelection: actualNormalizedSelection.value,
      multiSelections: actualMultiSelections.value,
      tableData: actualTableData.value,
    };

    const textToCopy = getCopyText(context);

    if (textToCopy === null || textToCopy === "") {
      return false;
    }

    try {
      await clipboardOps.copyToClipboard(textToCopy);
      recordCutRange(context);
      return true;
    } catch (error) {
      console.error("Failed to cut to clipboard:", error);
      return false;
    }
  };

  /**
   * 处理复制操作（事件驱动）
   */
  const handleCopy = (event: ClipboardEvent): void => {
    const context: CopyContext = {
      isEditing: !!actualEditingCell.value,
      editingCell: actualEditingCell.value,
      activeCell: actualActiveCell.value,
      normalizedSelection: actualNormalizedSelection.value,
      multiSelections: actualMultiSelections.value,
      tableData: actualTableData.value,
    };

    const textToCopy = getCopyText(context);

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
      // 保存复制时的选区范围（复制源区域）
      if (context.normalizedSelection) {
        copiedRange.value = { ...context.normalizedSelection };
      } else if (context.activeCell) {
        // 如果没有选区，只有活动单元格，创建一个单单元格选区
        copiedRange.value = {
          minRow: context.activeCell.row,
          maxRow: context.activeCell.row,
          minCol: context.activeCell.col,
          maxCol: context.activeCell.col,
        };
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
      isEditing: !!actualEditingCell.value,
      editingCell: actualEditingCell.value,
      activeCell: actualActiveCell.value,
      normalizedSelection: actualNormalizedSelection.value,
      multiSelections: actualMultiSelections.value,
      tableData: actualTableData.value,
    };

    const textToCopy = getCopyText(context);

    if (textToCopy === null || textToCopy === "") {
      return false;
    }

    try {
      await clipboardOps.copyToClipboard(textToCopy);
      // 保存复制时的选区范围（复制源区域）
      if (context.normalizedSelection) {
        copiedRange.value = { ...context.normalizedSelection };
      } else if (context.activeCell) {
        // 如果没有选区，只有活动单元格，创建一个单单元格选区
        copiedRange.value = {
          minRow: context.activeCell.row,
          maxRow: context.activeCell.row,
          minCol: context.activeCell.col,
          maxCol: context.activeCell.col,
        };
      }
      cutRange.value = null;
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
      isEditing: !!actualEditingCell.value,
      editingCell: actualEditingCell.value,
      activeCell: actualActiveCell.value,
      normalizedSelection: actualNormalizedSelection.value,
      clipboardText: event.clipboardData?.getData("text") || "",
      tableData: actualTableData.value,
    };

    // 如果是编辑模式，让浏览器原生处理
    if (context.isEditing) {
      return;
    }

    event.preventDefault();

    // 如果处于剪切模式，跳过历史记录保存，由 clearCutSourceIfNeeded 统一保存
    const isCutMode = !!cutRange.value;

    const result = pasteStrategy.executePaste(context, {
      rows: actualRows,
      columns: actualColumns,
      generateColumnLabel,
      saveHistory,
      selectionService,
      isCellEditable,
      emitSync,
      skipHistorySave: isCutMode,
      sourceRange: copiedRange.value, // 传递复制源区域
    });

    if (!result.success) {
      console.warn("Paste failed:", result.error);
    } else {
      // 粘贴成功后，清除复制/剪切区域样式
      clearCutSourceIfNeeded(result, result.changes || []);
      if (!cutRange.value) {
        copiedRange.value = null;
      }
    }
  };

  /**
   * 程序化粘贴（菜单、快捷键触发）
   */
  const pasteFromClipboard = async (): Promise<boolean> => {
    try {
      const clipboardText = await clipboardOps.readFromClipboard();

      const context: PasteContext = {
        isEditing: !!actualEditingCell.value,
        editingCell: actualEditingCell.value,
        activeCell: actualActiveCell.value,
        normalizedSelection: actualNormalizedSelection.value,
        clipboardText,
        tableData: actualTableData.value,
      };

      // 如果处于剪切模式，跳过历史记录保存，由 clearCutSourceIfNeeded 统一保存
      const isCutMode = !!cutRange.value;

      const result = pasteStrategy.executePaste(context, {
        rows: actualRows,
        columns: actualColumns,
        generateColumnLabel,
        saveHistory,
        selectionService,
        isCellEditable,
        emitSync,
        skipHistorySave: isCutMode,
        sourceRange: copiedRange.value, // 传递复制源区域
      });

      if (result.success) {
        // 粘贴成功后，清除复制区域样式
        clearCutSourceIfNeeded(result, result.changes || []);
        if (!cutRange.value) {
          copiedRange.value = null;
        }
      }

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
    cutToClipboard,
    pasteFromClipboard,
    hasClipboardContent,
    copiedRange,
    exitCopyMode,
  };
}
