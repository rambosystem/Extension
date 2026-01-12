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
  startColumnResize: (colIndex: number, event: MouseEvent) => void;
  handleColumnResize: (event: MouseEvent) => void;
  stopColumnResize: () => void;
  handleDoubleClickResize: (
    colIndex: number,
    columns: string[],
    tableData: string[][]
  ) => void;
  autoFitColumn: (
    colIndex: number,
    columns: string[],
    tableData: string[][]
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
   */
  const stopColumnResize = (): void => {
    isResizingColumn.value = false;
    resizingColumnIndex.value = null;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    window.removeEventListener("mousemove", handleColumnResize);
    window.removeEventListener("mouseup", stopColumnResize);
    document.body.style.cursor = "";
  };

  /**
   * 开始调整
   */
  const startColumnResize = (colIndex: number, event: MouseEvent): void => {
    event.preventDefault();
    isResizingColumn.value = true;
    resizingColumnIndex.value = colIndex;
    resizeStartX = event.clientX;
    resizeStartWidth = getColumnWidth(colIndex);

    window.addEventListener("mousemove", handleColumnResize);
    window.addEventListener("mouseup", stopColumnResize);
    document.body.style.cursor = "col-resize";
  };

  const autoFitColumn = (
    colIndex: number,
    columns: string[],
    tableData: string[][]
  ): void => {
    let maxContentWidth = defaultWidth;

    if (columns && columns[colIndex]) {
      const headerWidth = getTextWidth(String(columns[colIndex]), fontStyle);
      maxContentWidth = Math.max(maxContentWidth, headerWidth + 24);
    }

    if (tableData && tableData.length > 0) {
      const sampleLimit = Math.min(tableData.length, 100);
      for (let r = 0; r < sampleLimit; r++) {
        const row = tableData[r];
        const cellValue = Array.isArray(row) ? row[colIndex] : undefined;
        if (cellValue) {
          const strVal = String(cellValue);
          if (strVal.length > 0) {
            const width = getTextWidth(strVal, fontStyle);
            maxContentWidth = Math.max(maxContentWidth, width + 20);
          }
        }
      }
    }
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, maxContentWidth));
    columnWidths.value.set(colIndex, finalWidth);
  };

  const handleDoubleClickResize = (
    colIndex: number,
    columns: string[],
    tableData: string[][]
  ): void => {
    autoFitColumn(colIndex, columns, tableData);
  };

  onUnmounted(() => {
    window.removeEventListener("mousemove", handleColumnResize);
    window.removeEventListener("mouseup", stopColumnResize);
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
