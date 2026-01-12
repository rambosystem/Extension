import type { Ref } from "vue";
import type { SelectionRange } from "../types";
import type { UseSelectionReturn } from "./useSelection";

export interface SelectionService {
  applyRange: (range?: SelectionRange | null) => void;
  startSingleSelection: (row: number, col: number) => void;
  updateSingleSelectionEnd: (row: number, col: number) => void;
  clear: () => void;
  selectRow: (rowIndex: number) => void;
  selectColumn: (colIndex: number) => void;
  selectRows: (startRow: number, endRow: number) => void;
  selectColumns: (startCol: number, endCol: number) => void;
  selectAll: (rowCount: number, colCount: number) => void;
}

export interface SelectionServiceOptions {
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  selection: UseSelectionReturn;
}

export const createSelectionService = (
  options: SelectionServiceOptions
): SelectionService => {
  const { rows, columns, selection } = options;

  const applyRange = (range?: SelectionRange | null): void => {
    if (!range || rows.value.length === 0 || columns.value.length === 0) {
      selection.clearSelection();
      return;
    }

    const maxRowIndex = rows.value.length - 1;
    const maxColIndex = columns.value.length - 1;

    const minRow = Math.max(0, Math.min(range.minRow, maxRowIndex));
    const maxRow = Math.max(0, Math.min(range.maxRow, maxRowIndex));
    const minCol = Math.max(0, Math.min(range.minCol, maxColIndex));
    const maxCol = Math.max(0, Math.min(range.maxCol, maxColIndex));

    selection.applySelectionRange({
      minRow,
      maxRow,
      minCol,
      maxCol,
    });
  };

  return {
    applyRange,
    startSingleSelection: selection.startSingleSelection,
    updateSingleSelectionEnd: selection.updateSingleSelectionEnd,
    clear: selection.clearSelection,
    selectRow: selection.selectRow,
    selectColumn: selection.selectColumn,
    selectRows: selection.selectRows,
    selectColumns: selection.selectColumns,
    selectAll: selection.selectAll,
  };
};
