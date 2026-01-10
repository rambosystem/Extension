import type { Ref } from "vue";

/**
 * 单元格显示样式
 */
export interface CellDisplayStyle {
  wrap: boolean;
  ellipsis: boolean;
  align: "center" | "top" | "bottom";
}

/**
 * useCellDisplay 选项
 */
export interface UseCellDisplayOptions {
  tableData: Ref<string[][]>;
  getColumnWidth: (colIndex: number) => number;
  getRowHeight: (rowIndex: number) => number;
}

/**
 * useCellDisplay 返回值
 */
export interface UseCellDisplayReturn {
  getTextDisplayWidth: (text: string) => number;
  getCellDisplayStyle: (rowIndex: number, colIndex: number) => CellDisplayStyle;
}

/**
 * 单元格显示样式管理 Composable
 */
export function useCellDisplay({
  tableData,
  getColumnWidth,
  getRowHeight,
}: UseCellDisplayOptions): UseCellDisplayReturn {
  /**
   * 计算文本的真实显示宽度
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
   * 获取单元格显示样式
   */
  const getCellDisplayStyle = (
    rowIndex: number,
    colIndex: number
  ): CellDisplayStyle => {
    const cellValue = tableData.value[rowIndex]?.[colIndex] || "";
    const cellText = String(cellValue);

    if (!cellText) {
      return { wrap: false, ellipsis: false, align: "center" };
    }

    const columnWidth = getColumnWidth(colIndex);
    const rowHeight = getRowHeight(rowIndex);

    const paddingH = 13;
    const fontSize = 13;
    const lineHeightRatio = 1.4;
    const lineHeightPx = fontSize * lineHeightRatio;

    const textWidth = getTextDisplayWidth(cellText);
    const availableWidth = columnWidth - paddingH;

    if (textWidth <= availableWidth) {
      return { wrap: false, ellipsis: false, align: "center" };
    }

    const lineContentWidth = availableWidth - 2;
    const linesNeeded = Math.ceil(textWidth / Math.max(lineContentWidth, 1));

    const requiredHeight = linesNeeded * lineHeightPx + 4;

    if (rowHeight >= requiredHeight) {
      return { wrap: true, ellipsis: false, align: "center" };
    }

    return { wrap: false, ellipsis: true, align: "center" };
  };

  return {
    getTextDisplayWidth,
    getCellDisplayStyle,
  };
}
