import type { Ref } from "vue";
import { handleUndoRedoOperation } from "../../utils/undoRedoHandler";
import type { SelectionService } from "../selection/selectionService";

export interface UndoRedoServiceOptions {
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  activeCell?: Ref<{ row: number; col: number } | null> | null;
  selectionService: SelectionService;
  triggerSelectionFlash?: () => void;
  notifyDataChange?: () => void;
}

export interface UndoRedoService {
  apply: (result: { state: string[][]; metadata?: Record<string, any> } | null) => boolean;
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
    notifyDataChange,
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
        notifyDataChange,
      }),
  };
};
