import type { Ref, ShallowRef } from "vue";
import type { UseColumnWidthReturn } from "./useColumnWidth";
import type { UseRowHeightReturn } from "./useRowHeight";

/**
 * useResizeHandlers 选项
 */
export interface UseResizeHandlersOptions {
  props: {
    enableColumnResize?: boolean;
    enableRowResize?: boolean;
    defaultColumnWidth?: number | { key?: number; others?: number };
  };
  columnWidthComposable: UseColumnWidthReturn | null;
  rowHeightComposable: UseRowHeightReturn | null;
  tableData: Ref<string[][]>;
  columns: Ref<string[]>;
  getColumnWidth: (colIndex: number) => number;
  /** 获取默认列宽（不考虑用户已设置的宽度），用于自适应列宽 */
  getDefaultColumnWidth: (colIndex: number) => number;
  /**
   * 鼠标抬起处理函数的 ShallowRef。
   *
   * 使用 Ref 而非值传递，避免在 composable 初始化时
   * 捕获到 null 的闭包（此时外层的 handleMouseUp 可能尚未定义）。
   * 消费者侧可在 useMouseEvents 返回后写入。
   */
  handleMouseUpRef?: ShallowRef<((event: MouseEvent) => void) | null>;
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
  getDefaultColumnWidth,
  handleMouseUpRef,
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
      // 传递 getColumnWidth 以确保获取实际的显示宽度
      // 这样在第一列（key 列）有特殊宽度时不会出现抖动
      columnWidthComposable.startColumnResize(colIndex, event, getColumnWidth);
    }
    window.addEventListener("mousemove", handleColumnResizeMove);
    const handleMouseUp = handleMouseUpRef?.value ?? null;
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
    const handleMouseUp = handleMouseUpRef?.value ?? null;
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
        tableData.value,
        // 使用 getDefaultColumnWidth 以确保自适应时从默认宽度开始计算
        // 而不是从已设置的宽度开始，这样当内容变少时可以正确缩小
        getDefaultColumnWidth
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
