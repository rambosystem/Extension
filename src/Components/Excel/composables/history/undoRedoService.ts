import type { Ref } from "vue";
import { handleUndoRedoOperation } from "../../utils/undoRedoHandler";
import type { SelectionService } from "../selection/selectionService";
import type { HistoryRestoreResult } from "./useHistory";

export interface UndoRedoServiceOptions {
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  activeCell?: Ref<{ row: number; col: number } | null> | null;
  selectionService: SelectionService;
  triggerSelectionFlash?: () => void;
  emitSync?: () => void;
}

export interface UndoRedoService {
  apply: (result: HistoryRestoreResult | null) => boolean;
}

export const createUndoRedoService = (
  options: UndoRedoServiceOptions
): UndoRedoService => {
  const {
    tableData,
    rows,
    columns,
    activeCell,
    selectionService,
    triggerSelectionFlash,
    emitSync,
  } = options;

  return {
    apply: (result) =>
      handleUndoRedoOperation({
        result,
        tableData,
        rows,
        columns,
        activeCell,
        selectionService,
        triggerSelectionFlash,
        emitSync,
      }),
  };
};
