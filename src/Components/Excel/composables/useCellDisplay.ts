import type { Ref } from "vue";
import { DEFAULT_CONFIG } from "./constants";

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
 *
 * 性能优化：
 * - 使用常量配置替代魔法数字
 * - 样式计算结果可以进一步优化（如果需要，可以添加缓存）
 */
export function useCellDisplay({
  tableData,
  getColumnWidth,
  getRowHeight,
}: UseCellDisplayOptions): UseCellDisplayReturn {
  // 使用常量配置
  const PADDING_H = DEFAULT_CONFIG.CELL_PADDING_H;
  const FONT_SIZE = DEFAULT_CONFIG.FONT_SIZE;
  const LINE_HEIGHT_RATIO = DEFAULT_CONFIG.LINE_HEIGHT_RATIO;

  /**
   * 计算文本的真实显示宽度（区分全角和半角字符）
   * 全角字符（如中文）宽度约为 13.5px，半角字符（如英文）宽度约为 8.5px
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
   *
   * 计算逻辑：
   * 1. 如果文本宽度 <= 可用宽度：正常显示（不换行，不省略）
   * 2. 如果文本宽度 > 可用宽度 且 行高足够：换行显示
   * 3. 如果文本宽度 > 可用宽度 且 行高不足：省略显示
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

    const lineHeightPx = FONT_SIZE * LINE_HEIGHT_RATIO;

    const textWidth = getTextDisplayWidth(cellText);
    const availableWidth = columnWidth - PADDING_H;

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
