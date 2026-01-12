import type { CellPosition, SelectionRange } from "../types";

export interface ClipboardCopyContext {
  isEditing: boolean;
  activeCell: CellPosition | null;
  normalizedSelection: SelectionRange | null;
  multiSelections: SelectionRange[];
  tableData: string[][];
}

export const getCopyText = (context: ClipboardCopyContext): string | null => {
  if (context.isEditing) {
    return null;
  }

  if (context.multiSelections.length > 1) {
    return formatMultipleSelections(context);
  }

  if (context.normalizedSelection) {
    return formatRectangularSelection(context);
  }

  if (context.activeCell) {
    return formatSingleCell(context);
  }

  return null;
};

export const parseClipboardText = (clipboardText: string): string[][] => {
  if (!clipboardText || typeof clipboardText !== "string") {
    return [];
  }

  try {
    const lines = clipboardText.split(/\r?\n/);
    const parsedRows = lines.map((row) => {
      if (row === "") {
        return [];
      }
      return row.split("\t");
    });

    const maxCols = Math.max(
      ...parsedRows.map((row) => row.length),
      1
    );

    return parsedRows.map((row) => {
      if (row.length === 0) {
        return Array.from({ length: maxCols }, () => "");
      }
      return row;
    });
  } catch (error) {
    console.warn("Failed to parse paste data:", error);
    return [];
  }
};

const formatRectangularSelection = (
  context: ClipboardCopyContext
): string => {
  const { normalizedSelection, tableData } = context;
  if (!normalizedSelection) return "";

  const rows: string[] = [];
  for (let r = normalizedSelection.minRow; r <= normalizedSelection.maxRow; r++) {
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
};

const formatMultipleSelections = (
  context: ClipboardCopyContext
): string => {
  const { multiSelections, tableData } = context;

  const minRow = Math.min(...multiSelections.map((s) => s.minRow));
  const maxRow = Math.max(...multiSelections.map((s) => s.maxRow));
  const minCol = Math.min(...multiSelections.map((s) => s.minCol));
  const maxCol = Math.max(...multiSelections.map((s) => s.maxCol));

  const rows: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const cells: string[] = [];
    for (let c = minCol; c <= maxCol; c++) {
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
};

const formatSingleCell = (context: ClipboardCopyContext): string => {
  const { activeCell, tableData } = context;
  if (!activeCell) return "";

  return tableData[activeCell.row]?.[activeCell.col] ?? "";
};
