import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { CellPosition, SelectionRange } from "./types";
import { DEFAULT_CONFIG } from "./constants";

/**
 * Excel 数据状态
 */
export interface ExcelDataState {
  tableData: Ref<string[][]>;
  columns: Ref<string[]>;
  rows: Ref<number[]>;
}

/**
 * Excel 选择状态
 */
export interface ExcelSelectionState {
  activeCell: Ref<CellPosition | null>;
  selectionStart: Ref<CellPosition | null>;
  selectionEnd: Ref<CellPosition | null>;
  isSelecting: Ref<boolean>;
  multiSelections: Ref<SelectionRange[]>;
  isMultipleMode: Ref<boolean>;
  normalizedSelection: ComputedRef<SelectionRange | null>;
}

/**
 * Excel 编辑状态
 */
export interface ExcelEditingState {
  editingCell: Ref<CellPosition | null>;
}

/**
 * Excel UI 状态（尺寸等）
 */
export interface ExcelUIState {
  columnWidths: Ref<Map<number, number>>;
  rowHeights: Ref<Map<number, number>>;
}

/**
 * Excel 核心状态接口
 *
 * 统一管理 Excel 组件的所有核心状态
 * 提供单一数据源（Single Source of Truth）
 */
export interface ExcelState {
  data: ExcelDataState;
  selection: ExcelSelectionState;
  editing: ExcelEditingState;
  ui: ExcelUIState;
}

/**
 * useExcelState 选项
 */
export interface UseExcelStateOptions {
  rowsCount?: number;
  colsCount?: number;
  initialData?: string[][] | null;
}

/**
 * Excel 状态管理 Composable
 *
 * 设计原则：
 * 1. 统一管理核心状态，提供单一数据源
 * 2. 保持与现有 composables 的兼容性
 * 3. 支持渐进式迁移
 *
 * 使用方式：
 * ```typescript
 * const excelState = useExcelState({ initialData: props.modelValue });
 *
 * // 访问状态
 * excelState.data.tableData.value
 * excelState.selection.activeCell.value
 *
 * // 传递给 composables
 * const selection = useSelection(excelState.selection);
 * ```
 */
export function useExcelState({
  rowsCount = DEFAULT_CONFIG.ROWS_COUNT,
  colsCount = DEFAULT_CONFIG.COLS_COUNT,
  initialData = null,
}: UseExcelStateOptions = {}): ExcelState {
  // ==================== 数据状态 ====================

  /**
   * 根据实际数据动态计算行列数
   */
  const calculateDimensions = (
    data: string[][] | null | undefined,
    allowEmpty = false
  ): { rows: number; cols: number } => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return allowEmpty
        ? { rows: 0, cols: 0 }
        : { rows: rowsCount, cols: colsCount };
    }

    const actualRows = data.length;
    const rowLengths = data.map((row) => (Array.isArray(row) ? row.length : 0));
    const actualCols = Math.max(...rowLengths, 0);

    return { rows: actualRows, cols: actualCols };
  };

  // 初始化时根据数据计算维度
  const initialDimensions = calculateDimensions(initialData, true);
  const actualRowsCount = initialDimensions.rows;
  const actualColsCount = initialDimensions.cols;

  /**
   * 生成列标题（支持超过26列：A-Z, AA-AZ, BA-BZ...）
   */
  const generateColumnLabel = (index: number): string => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  // 初始化表格数据
  const initializeTableData = (): string[][] => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      const data = initialData.map((row) => {
        if (Array.isArray(row)) {
          const rowData = [...row];
          while (rowData.length < actualColsCount) {
            rowData.push("");
          }
          return rowData;
        }
        return Array.from({ length: actualColsCount }, () => "");
      });
      return data;
    }

    return Array.from({ length: actualRowsCount }, () =>
      Array.from({ length: actualColsCount }, () => "")
    );
  };

  const tableData = ref<string[][]>(initializeTableData());
  const columns = ref<string[]>(
    Array.from({ length: actualColsCount }, (_, i) => generateColumnLabel(i))
  );
  const rows = ref<number[]>(
    Array.from({ length: actualRowsCount }, (_, i) => i)
  );

  // ==================== 选择状态 ====================

  const activeCell = ref<CellPosition | null>(null);
  const selectionStart = ref<CellPosition | null>(null);
  const selectionEnd = ref<CellPosition | null>(null);
  const isSelecting = ref<boolean>(false);
  const multiSelections = ref<SelectionRange[]>([]);
  const isMultipleMode = ref<boolean>(false);

  // 计算归一化后的选区（始终确保 min <= max）
  const normalizedSelection = computed<SelectionRange | null>(() => {
    if (!selectionStart.value || !selectionEnd.value) return null;
    return {
      minRow: Math.min(selectionStart.value.row, selectionEnd.value.row),
      maxRow: Math.max(selectionStart.value.row, selectionEnd.value.row),
      minCol: Math.min(selectionStart.value.col, selectionEnd.value.col),
      maxCol: Math.max(selectionStart.value.col, selectionEnd.value.col),
    };
  });

  // ==================== 编辑状态 ====================

  const editingCell = ref<CellPosition | null>(null);

  // ==================== UI 状态 ====================

  const columnWidths = ref<Map<number, number>>(new Map());
  const rowHeights = ref<Map<number, number>>(new Map());

  // ==================== 返回状态对象 ====================

  return {
    data: {
      tableData,
      columns,
      rows,
    },
    selection: {
      activeCell,
      selectionStart,
      selectionEnd,
      isSelecting,
      multiSelections,
      isMultipleMode,
      normalizedSelection,
    },
    editing: {
      editingCell,
    },
    ui: {
      columnWidths,
      rowHeights,
    },
  };
}
