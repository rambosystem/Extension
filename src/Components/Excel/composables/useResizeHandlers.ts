import type { Ref } from "vue";
import type { UseColumnWidthReturn } from "./useColumnWidth";
import type { UseRowHeightReturn } from "./useRowHeight";

/**
 * useResizeHandlers 选项
 */
export interface UseResizeHandlersOptions {
  props: {
    enableColumnResize?: boolean;
    enableRowResize?: boolean;
  };
  columnWidthComposable: UseColumnWidthReturn | null;
  rowHeightComposable: UseRowHeightReturn | null;
  tableData: Ref<string[][]>;
  columns: Ref<string[]>;
  getColumnWidth: (colIndex: number) => number;
  handleMouseUp: ((event: MouseEvent) => void) | null;
}

/**
 * useResizeHandlers 返回值
 */
export interface UseResizeHandlersReturn {
  startColumnResize: (colIndex: number, event: MouseEvent) => void;
  startRowResize: (rowIndex: number, event: MouseEvent) => void;
  stopColumnResize: () => void;
  stopRowResize: () => void;
  handleDoubleClickResize: (colIndex: number) => void;
  handleDoubleClickRowResize: (rowIndex: number) => void;
  handleColumnResizeMove: (event: MouseEvent) => void;
  handleRowResizeMove: (event: MouseEvent) => void;
}

/**
 * 尺寸调整处理器管理 Composable
 */
export function useResizeHandlers({
  props,
  columnWidthComposable,
  rowHeightComposable,
  tableData,
  columns,
  getColumnWidth,
  handleMouseUp,
}: UseResizeHandlersOptions): UseResizeHandlersReturn {
  /**
   * 处理列宽调整（事件处理）
   */
  const handleColumnResizeMove = (event: MouseEvent): void => {
    if (props.enableColumnResize && columnWidthComposable) {
      columnWidthComposable.handleColumnResize(event);
    }
  };

  /**
   * 处理行高调整（事件处理）
   */
  const handleRowResizeMove = (event: MouseEvent): void => {
    if (props.enableRowResize && rowHeightComposable) {
      rowHeightComposable.handleRowResize(event);
    }
  };

  /**
   * 开始调整列宽
   */
  const startColumnResize = (colIndex: number, event: MouseEvent): void => {
    if (!props.enableColumnResize) return;
    if (columnWidthComposable) {
      columnWidthComposable.startColumnResize(colIndex, event);
    }
    window.addEventListener("mousemove", handleColumnResizeMove);
    if (handleMouseUp) {
      window.addEventListener("mouseup", handleMouseUp);
    }
  };

  /**
   * 开始调整行高
   */
  const startRowResize = (rowIndex: number, event: MouseEvent): void => {
    if (!props.enableRowResize) return;
    if (rowHeightComposable) {
      rowHeightComposable.startRowResize(rowIndex, event);
    }
    window.addEventListener("mousemove", handleRowResizeMove);
    if (handleMouseUp) {
      window.addEventListener("mouseup", handleMouseUp);
    }
  };

  /**
   * 停止列宽调整
   */
  const stopColumnResize = (): void => {
    if (props.enableColumnResize && columnWidthComposable) {
      columnWidthComposable.stopColumnResize();
    }
  };

  /**
   * 停止行高调整
   */
  const stopRowResize = (): void => {
    if (props.enableRowResize && rowHeightComposable) {
      rowHeightComposable.stopRowResize();
    }
  };

  /**
   * 处理双击列边界自适应
   */
  const handleDoubleClickResize = (colIndex: number): void => {
    if (!props.enableColumnResize) return;
    if (columnWidthComposable) {
      columnWidthComposable.handleDoubleClickResize(
        colIndex,
        columns.value,
        tableData.value
      );
    }
  };

  /**
   * 处理双击行边界自适应
   */
  const handleDoubleClickRowResize = (rowIndex: number): void => {
    if (!props.enableRowResize) return;
    if (rowHeightComposable) {
      rowHeightComposable.handleDoubleClickResize(
        rowIndex,
        tableData.value,
        columns.value.length,
        getColumnWidth
      );
    }
  };

  return {
    startColumnResize,
    startRowResize,
    stopColumnResize,
    stopRowResize,
    handleDoubleClickResize,
    handleDoubleClickRowResize,
    handleColumnResizeMove,
    handleRowResizeMove,
  };
}
