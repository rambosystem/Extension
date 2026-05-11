import { ref, onUnmounted, type Ref } from "vue";

// 缓存 Canvas context 避免重复创建
let cachedCtx: CanvasRenderingContext2D | null = null;

function getTextWidth(text: string, font = "13px sans-serif"): number {
  if (!text) return 0;
  if (!cachedCtx) {
    const canvas = document.createElement("canvas");
    cachedCtx = canvas.getContext("2d");
  }
  if (!cachedCtx) return 0;
  cachedCtx.font = font;
  const metrics = cachedCtx.measureText(text);
  return Math.ceil(metrics.width);
}

/**
 * useColumnWidth 选项
 */
export interface UseColumnWidthOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  fontStyle?: string;
}

/**
 * useColumnWidth 返回值
 */
export interface UseColumnWidthReturn {
  columnWidths: Ref<Map<number, number>>;
  isResizingColumn: Ref<boolean>;
  resizingColumnIndex: Ref<number | null>;
  getColumnWidth: (colIndex: number) => number;
  startColumnResize: (
    colIndex: number,
    event: MouseEvent,
    getCurrentWidth?: (colIndex: number) => number
  ) => void;
  handleColumnResize: (event: MouseEvent) => void;
  stopColumnResize: () => void;
  handleDoubleClickResize: (
    colIndex: number,
    columns: string[],
    tableData: string[][],
    getCurrentWidth?: (colIndex: number) => number
  ) => void;
  autoFitColumn: (
    colIndex: number,
    columns: string[],
    tableData: string[][],
    getCurrentWidth?: (colIndex: number) => number
  ) => void;
}

export function useColumnWidth({
  defaultWidth = 100,
  minWidth = 50,
  maxWidth = 500,
  fontStyle = "13px sans-serif",
}: UseColumnWidthOptions = {}): UseColumnWidthReturn {
  const columnWidths = ref<Map<number, number>>(new Map());
  const isResizingColumn = ref<boolean>(false);
  const resizingColumnIndex = ref<number | null>(null);

  let resizeStartX = 0;
  let resizeStartWidth = 0;
  let animationFrameId: number | null = null;

  const getColumnWidth = (colIndex: number): number => {
    return columnWidths.value.get(colIndex) ?? defaultWidth;
  };

  /**
   * 处理拖拽逻辑（已使用 requestAnimationFrame 优化，无需额外节流）
   */
  const handleColumnResize = (event: MouseEvent): void => {
    if (!isResizingColumn.value) return;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(() => {
      const deltaX = event.clientX - resizeStartX;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, resizeStartWidth + deltaX)
      );

      columnWidths.value.set(resizingColumnIndex.value!, newWidth);
    });
  };

  /**
   * 停止拖拽
   * 注意：mousemove / mouseup 的全局监听由 useResizeHandlers 统一移除，
   * 此处只重置内部状态。
   */
  const stopColumnResize = (): void => {
    isResizingColumn.value = false;
    resizingColumnIndex.value = null;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    document.body.style.cursor = "";
  };

  /**
   * 开始调整
   * 注意：mousemove / mouseup 的全局监听由调用方（useResizeHandlers）统一注册，
   * 此处只做状态初始化，不自行绑定全局事件，避免重复触发。
   *
   * @param colIndex 列索引
   * @param event 鼠标事件
   * @param getCurrentWidth 可选的获取当前实际宽度的函数，用于覆盖内部 getColumnWidth
   */
  const startColumnResize = (
    colIndex: number,
    event: MouseEvent,
    getCurrentWidth?: (colIndex: number) => number
  ): void => {
    event.preventDefault();
    isResizingColumn.value = true;
    resizingColumnIndex.value = colIndex;
    resizeStartX = event.clientX;
    // 优先使用外部传入的获取宽度函数，确保获取的是实际显示的宽度
    resizeStartWidth = getCurrentWidth ? getCurrentWidth(colIndex) : getColumnWidth(colIndex);
    document.body.style.cursor = "col-resize";
  };

  /**
   * 自适应列宽
   *
   * @param colIndex 列索引
   * @param columns 列标题数组
   * @param tableData 表格数据
   * @param getDefaultWidth 可选的获取默认宽度的函数（注意：不应返回已设置的宽度）
   */
  const autoFitColumn = (
    colIndex: number,
    columns: string[],
    tableData: string[][],
    getDefaultWidth?: (colIndex: number) => number
  ): void => {
    // 初始宽度从 0 开始计算，让内容决定宽度
    // 如果没有任何内容，再使用默认宽度
    let maxContentWidth = 0;

    // 计算列标题宽度（左右 padding 各 11px = 22px）
    if (columns && columns[colIndex]) {
      const headerWidth = getTextWidth(String(columns[colIndex]), fontStyle);
      maxContentWidth = Math.max(maxContentWidth, headerWidth + 22);
    }

    // 计算单元格内容宽度（左右 padding 各 11px = 22px）
    if (tableData && tableData.length > 0) {
      const sampleLimit = Math.min(tableData.length, 100);
      for (let r = 0; r < sampleLimit; r++) {
        const row = tableData[r];
        const cellValue = Array.isArray(row) ? row[colIndex] : undefined;
        if (cellValue) {
          const strVal = String(cellValue);
          if (strVal.length > 0) {
            const width = getTextWidth(strVal, fontStyle);
            maxContentWidth = Math.max(maxContentWidth, width + 22);
          }
        }
      }
    }

    // 如果没有任何内容，使用默认宽度
    if (maxContentWidth === 0) {
      maxContentWidth = getDefaultWidth ? getDefaultWidth(colIndex) : defaultWidth;
    }

    const finalWidth = Math.max(minWidth, Math.min(maxWidth, maxContentWidth));
    columnWidths.value.set(colIndex, finalWidth);
  };

  const handleDoubleClickResize = (
    colIndex: number,
    columns: string[],
    tableData: string[][],
    getCurrentWidth?: (colIndex: number) => number
  ): void => {
    autoFitColumn(colIndex, columns, tableData, getCurrentWidth);
  };

  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return {
    columnWidths,
    isResizingColumn,
    resizingColumnIndex,
    getColumnWidth,
    startColumnResize,
    handleColumnResize,
    stopColumnResize,
    handleDoubleClickResize,
    autoFitColumn,
  };
}
