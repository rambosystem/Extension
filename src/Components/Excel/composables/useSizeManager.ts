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
  /** 获取列宽（包括用户已设置的宽度） */
  getColumnWidth: (colIndex: number) => number;
  /** 获取默认列宽（不考虑用户已设置的宽度） */
  getDefaultColumnWidth: (colIndex: number) => number;
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
   * 获取默认列宽（不考虑用户已设置的宽度）
   * 用于自适应列宽时确定基准宽度
   */
  const getDefaultColumnWidth = (colIndex: number): number => {
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
   * 获取列宽（包括用户已设置的宽度）
   */
  const getColumnWidth = (colIndex: number): number => {
    if (props.enableColumnResize && columnWidthComposable) {
      const storedWidth =
        columnWidthComposable.columnWidths.value.get(colIndex);
      if (storedWidth !== undefined) {
        return storedWidth;
      }

      return getDefaultColumnWidth(colIndex);
    }

    return getDefaultColumnWidth(colIndex);
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
    getDefaultColumnWidth,
    getRowHeight,
  };
}
