import { ref, type Ref } from "vue";

/**
 * useRowHeight 选项
 */
export interface UseRowHeightOptions {
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  rowsCount?: number;
}

/**
 * useRowHeight 返回值
 */
export interface UseRowHeightReturn {
  rowHeights: Ref<Map<number, number>>;
  isResizingRow: Ref<boolean>;
  resizingRowIndex: Ref<number | null>;
  getRowHeight: (rowIndex: number) => number;
  startRowResize: (rowIndex: number, event: MouseEvent) => void;
  handleRowResize: (event: MouseEvent) => void;
  stopRowResize: () => void;
  handleDoubleClickResize: (
    rowIndex: number,
    tableData: string[][],
    colsCount: number,
    getColumnWidth: (colIndex: number) => number
  ) => void;
  autoFitRow: (
    rowIndex: number,
    tableData: string[][],
    colsCount: number,
    getColumnWidth: (colIndex: number) => number
  ) => void;
}

/**
 * 行高管理 Composable
 */
export function useRowHeight({
  defaultHeight = 28,
  minHeight = 20,
  maxHeight = 200,
  rowsCount = 15,
}: UseRowHeightOptions = {}): UseRowHeightReturn {
  const rowHeights = ref<Map<number, number>>(new Map());
  const isResizingRow = ref<boolean>(false);
  const resizingRowIndex = ref<number | null>(null);
  const resizeStartY = ref<number>(0);
  const resizeStartHeight = ref<number>(0);

  /**
   * 获取行高
   */
  const getRowHeight = (rowIndex: number): number => {
    return rowHeights.value.get(rowIndex) ?? defaultHeight;
  };

  /**
   * 计算文本真实显示宽度（区分全角和半角字符）
   */
  const getTextDisplayWidth = (text: string): number => {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      width += code < 256 ? 8.5 : 13.5;
    }
    return width;
  };

  /**
   * 计算单元格内容所需高度
   */
  const calculateCellHeight = (
    text: string,
    columnWidth: number,
    baseHeight: number = defaultHeight
  ): number => {
    if (!text || typeof text !== "string") {
      return baseHeight;
    }

    const paddingH = 13;
    const fontSize = 13;
    const lineHeightRatio = 1.4;
    const lineHeightPx = fontSize * lineHeightRatio;

    const textWidth = getTextDisplayWidth(text);
    const availableWidth = columnWidth - paddingH;

    if (textWidth <= availableWidth) {
      return baseHeight;
    }

    const lineContentWidth = availableWidth - 2;
    const linesNeeded =
      Math.ceil(textWidth / Math.max(lineContentWidth, 1)) || 1;

    const requiredHeight = linesNeeded * lineHeightPx + 4;

    return Math.max(minHeight, Math.min(maxHeight, requiredHeight));
  };

  /**
   * 自适应行高（根据行内容计算）
   */
  const autoFitRow = (
    rowIndex: number,
    tableData: string[][],
    colsCount: number,
    getColumnWidth: (colIndex: number) => number
  ): void => {
    if (rowIndex < 0 || rowIndex >= rowsCount) {
      return;
    }

    let maxHeight = defaultHeight;

    if (tableData && tableData[rowIndex]) {
      for (let c = 0; c < colsCount; c++) {
        if (tableData[rowIndex][c] !== undefined) {
          const cellValue = String(tableData[rowIndex][c] || "");
          const columnWidth = getColumnWidth ? getColumnWidth(c) : 100;
          const cellHeight = calculateCellHeight(cellValue, columnWidth);
          maxHeight = Math.max(maxHeight, cellHeight);
        }
      }
    }

    rowHeights.value.set(rowIndex, maxHeight + 4);
  };

  /**
   * 开始调整行高
   */
  const startRowResize = (rowIndex: number, event: MouseEvent): void => {
    isResizingRow.value = true;
    resizingRowIndex.value = rowIndex;
    resizeStartY.value = event.clientY;
    resizeStartHeight.value = getRowHeight(rowIndex);

    event.preventDefault();
  };

  /**
   * 处理行高调整
   */
  const handleRowResize = (event: MouseEvent): void => {
    if (!isResizingRow.value || resizingRowIndex.value === null) {
      return;
    }

    const deltaY = event.clientY - resizeStartY.value;
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, resizeStartHeight.value + deltaY)
    );

    rowHeights.value.set(resizingRowIndex.value, newHeight);
  };

  /**
   * 停止调整行高
   */
  const stopRowResize = (): void => {
    isResizingRow.value = false;
    resizingRowIndex.value = null;
    resizeStartY.value = 0;
    resizeStartHeight.value = 0;
  };

  /**
   * 处理双击行边界自适应
   */
  const handleDoubleClickResize = (
    rowIndex: number,
    tableData: string[][],
    colsCount: number,
    getColumnWidth: (colIndex: number) => number
  ): void => {
    autoFitRow(rowIndex, tableData, colsCount, getColumnWidth);
  };

  return {
    rowHeights,
    isResizingRow,
    resizingRowIndex,
    getRowHeight,
    startRowResize,
    handleRowResize,
    stopRowResize,
    handleDoubleClickResize,
    autoFitRow,
  };
}
