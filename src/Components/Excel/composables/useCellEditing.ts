import { nextTick } from "vue";
import type { Ref } from "vue";
import type { CellPosition } from "./types";
import {
  HistoryActionType,
  type CellChange,
  type SaveHistoryOptions,
} from "./useHistory";
import { debugLog } from "../../../utils/debug.js";
import type { ExcelDataState, ExcelEditingState } from "./useExcelState";

/**
 * 单元格编辑管理 Composable 选项
 */
export interface UseCellEditingOptions {
  /**
   * 统一状态管理（必需）
   */
  dataState: ExcelDataState;
  editingState: ExcelEditingState;
  startSingleSelection: (row: number, col: number) => void;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
  moveActiveCell: (
    rowDelta: number,
    colDelta: number,
    maxRows: number,
    maxCols: number
  ) => void;
  getMaxRows: () => number;
  getMaxCols: () => number;
  containerRef: Ref<HTMLElement | null>;
}

/**
 * 单元格编辑管理 Composable 返回值
 */
export interface UseCellEditingReturn {
  editingCell: Ref<CellPosition | null>;
  isEditing: (row: number, col: number) => boolean;
  startEdit: (
    row: number,
    col: number,
    selectAll?: boolean,
    initialValue?: string
  ) => void;
  stopEdit: () => void;
  cancelEdit: () => void;
  setInputRef: (el: HTMLInputElement | null, row: number, col: number) => void;
  handleInputEnter: (event: KeyboardEvent) => void;
  handleInputTab: (event: KeyboardEvent) => void;
  clearInputRefs: () => void;
}

/**
 * 单元格编辑管理 Composable
 *
 * 负责管理单元格的编辑状态、输入框引用和编辑相关操作
 *
 * 使用方式：
 * ```typescript
 * const excelState = useExcelState();
 * const editing = useCellEditing({
 *   dataState: excelState.data,
 *   editingState: excelState.editing,
 *   // ... 其他选项
 * });
 * ```
 */
export function useCellEditing({
  dataState,
  editingState,
  startSingleSelection,
  saveHistory,
  moveActiveCell,
  getMaxRows,
  getMaxCols,
  containerRef,
}: UseCellEditingOptions): UseCellEditingReturn {
  const { tableData } = dataState;
  const { editingCell } = editingState;
  let beforeEditSnapshot: string | null = null;

  // DOM Refs for Inputs
  const cellInputRefs = new Map<string, HTMLInputElement>();

  /**
   * 设置输入框引用
   */
  const setInputRef = (
    el: HTMLInputElement | null,
    row: number,
    col: number
  ): void => {
    if (!el) return;
    const key = `${row}-${col}`;
    cellInputRefs.set(key, el);
  };

  /**
   * 判断是否正在编辑指定单元格
   */
  const isEditing = (row: number, col: number): boolean =>
    editingCell.value?.row === row && editingCell.value?.col === col;

  /**
   * 开始编辑单元格
   * @param row - 行索引
   * @param col - 列索引
   * @param selectAll - 是否全选文本
   * @param initialValue - 可选的初始值（用于在数据已修改的情况下保存原始值）
   */
  const startEdit = (
    row: number,
    col: number,
    selectAll = true,
    initialValue?: string
  ): void => {
    // 边界检查
    if (row < 0 || row >= getMaxRows() || col < 0 || col >= getMaxCols()) {
      console.warn(`Invalid cell position: row=${row}, col=${col}`);
      return;
    }

    // 如果提供了初始值，使用它；否则使用当前单元格的值
    beforeEditSnapshot =
      initialValue !== undefined
        ? initialValue
        : tableData.value[row]?.[col] ?? "";
    editingCell.value = { row, col };
    startSingleSelection(row, col); // 确保编辑时选中该单元格

    debugLog("[CellEditing] startEdit", {
      row,
      col,
      beforeValue: beforeEditSnapshot,
      currentValue: tableData.value[row]?.[col] ?? "",
      initialValueProvided: initialValue !== undefined,
      selectAll,
    });

    // 使用 nextTick 确保 DOM 更新后再聚焦
    nextTick(() => {
      const key = `${row}-${col}`;
      const inputEl = cellInputRefs.get(key);
      if (inputEl) {
        inputEl.focus();
        if (selectAll) {
          inputEl.select();
        } else {
          const length = inputEl.value.length;
          inputEl.setSelectionRange(length, length);
        }
      }
    });
  };

  /**
   * 停止编辑单元格
   */
  const stopEdit = (): void => {
    if (!editingCell.value) {
      debugLog("[CellEditing] stopEdit: no editing cell, skipped");
      return;
    }
    const { row, col } = editingCell.value;

    const newValue = tableData.value[row]?.[col] ?? "";
    debugLog("[CellEditing] stopEdit: called", {
      row,
      col,
      beforeValue: beforeEditSnapshot,
      newValue,
      hasChange: beforeEditSnapshot !== newValue,
    });

    if (beforeEditSnapshot !== newValue) {
      // 构建变化信息
      const changes: CellChange[] = [
        {
          row,
          col,
          oldValue: beforeEditSnapshot ?? "",
          newValue,
        },
      ];

      debugLog("[CellEditing] stopEdit: saving history", {
        row,
        col,
        changes,
      });

      // 保存历史记录，指定操作类型为单元格编辑
      saveHistory(tableData.value, {
        type: HistoryActionType.CELL_EDIT,
        description: `Cell edit at (${row}, ${col})`,
        changes,
      });
    } else {
      debugLog("[CellEditing] stopEdit: no change detected, skipping history");
    }

    editingCell.value = null;
    beforeEditSnapshot = null;
    containerRef.value?.focus();
  };

  /**
   * 取消编辑单元格
   */
  const cancelEdit = (): void => {
    if (editingCell.value && beforeEditSnapshot !== null) {
      const { row, col } = editingCell.value;
      if (tableData.value[row]) {
        tableData.value[row][col] = beforeEditSnapshot;
      }
    }
    editingCell.value = null;
    beforeEditSnapshot = null;
    containerRef.value?.focus();
  };

  /**
   * 处理输入框 Enter 键
   */
  const handleInputEnter = (event: KeyboardEvent): void => {
    stopEdit();
    moveActiveCell(event.shiftKey ? -1 : 1, 0, getMaxRows(), getMaxCols());
    nextTick(() => containerRef.value?.focus());
  };

  /**
   * 处理输入框 Tab 键
   */
  const handleInputTab = (event: KeyboardEvent): void => {
    stopEdit();
    moveActiveCell(0, event.shiftKey ? -1 : 1, getMaxRows(), getMaxCols());
    nextTick(() => containerRef.value?.focus());
  };

  /**
   * 清理输入框引用
   */
  const clearInputRefs = (): void => {
    cellInputRefs.clear();
  };

  return {
    editingCell,
    isEditing,
    startEdit,
    stopEdit,
    cancelEdit,
    setInputRef,
    handleInputEnter,
    handleInputTab,
    clearInputRefs,
  };
}
