import { ref, nextTick, type Ref } from "vue";
import type { CellPosition } from "./types";

/**
 * 单元格编辑管理 Composable 选项
 */
export interface UseCellEditingOptions {
  tableData: Ref<string[][]>;
  activeCell: Ref<CellPosition | null>;
  startSingleSelection: (row: number, col: number) => void;
  saveHistory: (state: any) => void;
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
  startEdit: (row: number, col: number, selectAll?: boolean) => void;
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
 */
export function useCellEditing({
  tableData,
  activeCell,
  startSingleSelection,
  saveHistory,
  moveActiveCell,
  getMaxRows,
  getMaxCols,
  containerRef,
}: UseCellEditingOptions): UseCellEditingReturn {
  const editingCell = ref<CellPosition | null>(null);
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
   */
  const startEdit = (row: number, col: number, selectAll = true): void => {
    // 边界检查
    if (row < 0 || row >= getMaxRows() || col < 0 || col >= getMaxCols()) {
      console.warn(`Invalid cell position: row=${row}, col=${col}`);
      return;
    }

    beforeEditSnapshot = tableData.value[row]?.[col] ?? "";
    editingCell.value = { row, col };
    startSingleSelection(row, col); // 确保编辑时选中该单元格

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
    if (!editingCell.value) return;
    const { row, col } = editingCell.value;

    if (beforeEditSnapshot !== (tableData.value[row]?.[col] ?? "")) {
      saveHistory(tableData.value); // 数据变动保存历史
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
