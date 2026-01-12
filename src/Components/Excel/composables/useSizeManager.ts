import type { ColumnWidthConfig } from "./types";
import type { UseColumnWidthReturn } from "./rowColumnOps/useColumnWidth";
import type { UseRowHeightReturn } from "./rowColumnOps/useRowHeight";

/**
 * useSizeManager 选项
 */
export interface UseSizeManagerOptions {
  props: {
    enableColumnResize?: boolean;
    enableRowResize?: boolean;
    defaultColumnWidth?: number | ColumnWidthConfig;
    defaultRowHeight?: number;
  };
  columnWidthComposable: UseColumnWidthReturn | null;
  rowHeightComposable: UseRowHeightReturn | null;
}

/**
 * useSizeManager 返回值
 */
export interface UseSizeManagerReturn {
  getColumnWidth: (colIndex: number) => number;
  getRowHeight: (rowIndex: number) => number;
}

/**
 * 尺寸管理 Composable
 */
export function useSizeManager({
  props,
  columnWidthComposable,
  rowHeightComposable,
}: UseSizeManagerOptions): UseSizeManagerReturn {
  /**
   * 获取列宽
   */
  const getColumnWidth = (colIndex: number): number => {
    if (props.enableColumnResize && columnWidthComposable) {
      const storedWidth =
        columnWidthComposable.columnWidths.value.get(colIndex);
      if (storedWidth !== undefined) {
        return storedWidth;
      }

      if (
        typeof props.defaultColumnWidth === "object" &&
        props.defaultColumnWidth !== null
      ) {
        if (colIndex === 0) {
          return props.defaultColumnWidth.key || 120;
        }
        return props.defaultColumnWidth.others || 100;
      }

      return columnWidthComposable.getColumnWidth(colIndex);
    }

    if (
      typeof props.defaultColumnWidth === "object" &&
      props.defaultColumnWidth !== null
    ) {
      return colIndex === 0
        ? props.defaultColumnWidth.key || 120
        : props.defaultColumnWidth.others || 100;
    }
    return (props.defaultColumnWidth as number) || 100;
  };

  /**
   * 获取行高
   */
  const getRowHeight = (rowIndex: number): number => {
    if (props.enableRowResize && rowHeightComposable) {
      return rowHeightComposable.getRowHeight(rowIndex);
    }
    return props.defaultRowHeight || 36;
  };

  return {
    getColumnWidth,
    getRowHeight,
  };
}
