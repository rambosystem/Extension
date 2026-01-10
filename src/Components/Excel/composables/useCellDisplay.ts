import { watch, type Ref } from "vue";
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
  clearStyleCache: () => void; // 新增：清除样式缓存
}

/**
 * 单元格显示样式管理 Composable
 *
 * 性能优化：
 * - 使用常量配置替代魔法数字
 * - 添加样式计算结果缓存，减少重复计算
 * - 监听数据变化，自动清除缓存
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

  // 样式缓存：使用 Map 存储计算结果
  // Key: `${rowIndex}-${colIndex}`, Value: CellDisplayStyle
  const styleCache = new Map<string, CellDisplayStyle>();

  // 监听数据变化，清除缓存
  watch(
    tableData,
    () => {
      // 数据变化时清除所有缓存
      styleCache.clear();
    },
    { deep: true }
  );

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
   * 获取单元格显示样式（带缓存）
   *
   * 计算逻辑：
   * 1. 如果文本宽度 <= 可用宽度：正常显示（不换行，不省略）
   * 2. 如果文本宽度 > 可用宽度 且 行高足够：换行显示
   * 3. 如果文本宽度 > 可用宽度 且 行高不足：省略显示
   *
   * 性能优化：
   * - 使用缓存避免重复计算
   * - 缓存键基于单元格位置、内容、列宽和行高
   */
  const getCellDisplayStyle = (
    rowIndex: number,
    colIndex: number
  ): CellDisplayStyle => {
    const cellValue = tableData.value[rowIndex]?.[colIndex] || "";
    const cellText = String(cellValue);
    const columnWidth = getColumnWidth(colIndex);
    const rowHeight = getRowHeight(rowIndex);

    // 构建缓存键（包含所有影响样式的因素）
    const cacheKey = `${rowIndex}-${colIndex}-${cellText}-${columnWidth}-${rowHeight}`;

    // 检查缓存
    if (styleCache.has(cacheKey)) {
      return styleCache.get(cacheKey)!;
    }

    // 计算样式
    let style: CellDisplayStyle;

    if (!cellText) {
      style = { wrap: false, ellipsis: false, align: "center" };
    } else {
      const lineHeightPx = FONT_SIZE * LINE_HEIGHT_RATIO;
      const textWidth = getTextDisplayWidth(cellText);
      const availableWidth = columnWidth - PADDING_H;

      if (textWidth <= availableWidth) {
        style = { wrap: false, ellipsis: false, align: "center" };
      } else {
        const lineContentWidth = availableWidth - 2;
        const linesNeeded = Math.ceil(
          textWidth / Math.max(lineContentWidth, 1)
        );
        const requiredHeight = linesNeeded * lineHeightPx + 4;

        if (rowHeight >= requiredHeight) {
          style = { wrap: true, ellipsis: false, align: "center" };
        } else {
          style = { wrap: false, ellipsis: true, align: "center" };
        }
      }
    }

    // 缓存结果（限制缓存大小，避免内存泄漏）
    if (styleCache.size > 1000) {
      // 如果缓存过大，清除一半（简单的 LRU 策略）
      const keysToDelete = Array.from(styleCache.keys()).slice(0, 500);
      keysToDelete.forEach((key) => styleCache.delete(key));
    }
    styleCache.set(cacheKey, style);

    return style;
  };

  /**
   * 清除样式缓存
   * 用于手动清除缓存（例如列宽或行高变化时）
   */
  const clearStyleCache = (): void => {
    styleCache.clear();
  };

  return {
    getTextDisplayWidth,
    getCellDisplayStyle,
    clearStyleCache,
  };
}
