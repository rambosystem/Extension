import type { Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";

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
  generateClipboardText: (range: SelectionRange, data: string[][]) => string;
  parsePasteData: (clipboardText: string) => string[][];
  saveHistory: (state: any) => void;
}

/**
 * useClipboard 返回值
 */
export interface UseClipboardReturn {
  handleCopy: (event: ClipboardEvent) => void;
  handlePaste: (event: ClipboardEvent) => void;
}

/**
 * 剪贴板管理 Composable
 */
export function useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  activeCell,
  rows,
  columns,
  generateClipboardText,
  parsePasteData,
  saveHistory,
}: UseClipboardOptions): UseClipboardReturn {
  /**
   * 生成列标题（支持超过26列）
   */
  const generateColumnLabel = (index: number): string => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  /**
   * 处理复制操作
   */
  const handleCopy = (event: ClipboardEvent): void => {
    if (editingCell.value || !normalizedSelection.value) {
      return;
    }

    event.preventDefault();
    const textData = generateClipboardText(
      normalizedSelection.value,
      tableData.value
    );

    try {
      if (event.clipboardData) {
        event.clipboardData.setData("text/plain", textData);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(textData).catch((error) => {
          console.warn("Failed to write to clipboard:", error);
        });
      }
    } catch (error) {
      console.warn("Copy operation failed:", error);
    }
  };

  /**
   * 处理粘贴操作
   */
  const handlePaste = (event: ClipboardEvent): void => {
    if (editingCell.value) {
      return;
    }

    event.preventDefault();

    try {
      const text =
        (event.clipboardData || (window as any).clipboardData)?.getData("text") || "";
      const pasteData = parsePasteData(text);

      if (pasteData.length === 0) {
        return;
      }

      saveHistory(tableData.value);

      const startRow = activeCell.value?.row ?? 0;
      const startCol = activeCell.value?.col ?? 0;

      pasteData.forEach((rowArr, rIndex) => {
        const r = startRow + rIndex;
        if (r < 0) {
          return;
        }

        if (r >= rows.value.length) {
          const currentLength = rows.value.length;
          for (let i = currentLength; i <= r; i++) {
            rows.value.push(i);
            const currentCols = columns.value.length;
            tableData.value.push(Array.from({ length: currentCols }, () => ""));
          }
        }

        rowArr.forEach((cellVal, cIndex) => {
          const c = startCol + cIndex;
          if (c < 0) {
            return;
          }

          if (c >= columns.value.length) {
            const currentLength = columns.value.length;
            for (let i = currentLength; i <= c; i++) {
              columns.value.push(generateColumnLabel(i));
            }
            tableData.value.forEach((rowData) => {
              while (rowData.length <= c) {
                rowData.push("");
              }
            });
          }

          if (tableData.value[r]) {
            tableData.value[r][c] = cellVal;
          }
        });
      });
    } catch (error) {
      console.warn("Paste operation failed:", error);
    }
  };

  return {
    handleCopy,
    handlePaste,
  };
}
