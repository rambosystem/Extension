export interface CellChangeLike {
  row: number;
  col: number;
}

export const buildSelectionRangeFromChanges = (
  changes: CellChangeLike[]
): Record<string, number> | null => {
  if (!changes || changes.length === 0) {
    return null;
  }

  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  changes.forEach((change) => {
    minRow = Math.min(minRow, change.row);
    maxRow = Math.max(maxRow, change.row);
    minCol = Math.min(minCol, change.col);
    maxCol = Math.max(maxCol, change.col);
  });

  if (
    !Number.isFinite(minRow) ||
    !Number.isFinite(maxRow) ||
    !Number.isFinite(minCol) ||
    !Number.isFinite(maxCol)
  ) {
    return null;
  }

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
  };
};
