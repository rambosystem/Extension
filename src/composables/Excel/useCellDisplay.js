/**
 * 单元格显示样式管理 Composable
 *
 * 负责计算单元格的显示样式（换行、省略号、对齐方式等）
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {Function} context.getColumnWidth - 获取列宽函数
 * @param {Function} context.getRowHeight - 获取行高函数
 * @returns {Object} 返回显示样式计算方法
 */
export function useCellDisplay({ tableData, getColumnWidth, getRowHeight }) {
  /**
   * 计算文本的真实显示宽度
   * 区分全角字符（汉字/全角标点，约 13px）和半角字符（英文/数字，约 7-8px）
   * @param {string} text - 文本内容
   * @returns {number} 文本宽度（像素）
   */
  const getTextDisplayWidth = (text) => {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // ASCII 字符 (英文/数字) 算 8.5px，其他 (汉字等) 算 13.5px (对应 font-size: 13px)
      // 增加一点 buffer (0.5px) 防止渲染误差
      width += code < 256 ? 8.5 : 13.5;
    }
    return width;
  };

  /**
   * 优化后的显示逻辑
   * 根据列宽和行高智能判断：
   * - 如果列宽足够，单行显示，垂直居中
   * - 如果列宽不够但行高足够，换行显示，顶部对齐
   * - 如果都不够，显示省略号，垂直居中
   * @param {number} rowIndex - 行索引
   * @param {number} colIndex - 列索引
   * @returns {Object} 返回样式配置对象 { wrap, ellipsis, align }
   */
  const getCellDisplayStyle = (rowIndex, colIndex) => {
    const cellValue = tableData.value[rowIndex]?.[colIndex] || "";
    const cellText = String(cellValue);

    if (!cellText) {
      return { wrap: false, ellipsis: false, align: "center" };
    }

    // 获取当前实时的行列尺寸
    const columnWidth = getColumnWidth(colIndex);
    const rowHeight = getRowHeight(rowIndex);

    // 基础样式参数 (需与 CSS 保持一致)
    const paddingH = 13; // 左右 padding (6+6) + border/buffer (1)
    const fontSize = 13;
    const lineHeightRatio = 1.4; // CSS line-height
    const lineHeightPx = fontSize * lineHeightRatio; // ~18.2px

    // 1. 计算文本内容的真实宽度
    const textWidth = getTextDisplayWidth(cellText);
    const availableWidth = columnWidth - paddingH;

    // 情况 A: 列宽足够 -> 单行显示，垂直居中
    if (textWidth <= availableWidth) {
      return { wrap: false, ellipsis: false, align: "center" };
    }

    // 情况 B: 列宽不够 -> 计算需要折多少行
    // 估算每行能放多少像素，保守计算减去一点右侧 buffer
    const lineContentWidth = availableWidth - 2;
    // 即使是 0 也要保证至少有一行，防止除以 0
    const linesNeeded = Math.ceil(textWidth / Math.max(lineContentWidth, 1));

    // 计算所需高度 (行数 * 行高 + 上下 padding 4px)
    const requiredHeight = linesNeeded * lineHeightPx + 4;

    // 如果当前行高 >= 所需高度 -> 允许换行，垂直居中
    if (rowHeight >= requiredHeight) {
      return { wrap: true, ellipsis: false, align: "center" };
    }

    // 情况 C: 空间实在不够 -> 强制单行省略，垂直居中
    return { wrap: false, ellipsis: true, align: "center" };
  };

  return {
    getTextDisplayWidth,
    getCellDisplayStyle,
  };
}
