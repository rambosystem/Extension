/**
 * 尺寸管理 Composable
 *
 * 负责管理列宽和行高的获取逻辑，处理默认值和用户自定义值
 *
 * @param {Object} context - 上下文对象
 * @param {Object} context.props - 组件 props
 * @param {Object} context.columnWidthComposable - 列宽管理 composable
 * @param {Object} context.rowHeightComposable - 行高管理 composable
 * @returns {Object} 返回尺寸获取方法
 */
export function useSizeManager({
  props,
  columnWidthComposable,
  rowHeightComposable,
}) {
  /**
   * 获取列宽
   * @param {number} colIndex - 列索引
   * @returns {number} 列宽（像素）
   */
  const getColumnWidth = (colIndex) => {
    if (props.enableColumnResize && columnWidthComposable) {
      // 1. 如果用户已手动调整过宽度，以 map 中的值为准
      const storedWidth =
        columnWidthComposable.columnWidths.value.get(colIndex);
      if (storedWidth !== undefined) {
        return storedWidth;
      }

      // 2. 如果未调整，检查 defaultColumnWidth 是否为对象（来自 TranslationResultDialog）
      if (
        typeof props.defaultColumnWidth === "object" &&
        props.defaultColumnWidth !== null
      ) {
        // 传入的是 { key: 120, others: avgWidth } 对象
        if (colIndex === 0) {
          return props.defaultColumnWidth.key || 120; // 第 0 列使用 Key 宽度 (120px)
        }
        return props.defaultColumnWidth.others || 100; // 其他列使用平均宽度
      }

      // 3. 如果 defaultColumnWidth 是数字，使用 composable 的默认逻辑
      return columnWidthComposable.getColumnWidth(colIndex);
    }

    // 4. 禁用列宽调整时或传入数字默认值时
    if (
      typeof props.defaultColumnWidth === "object" &&
      props.defaultColumnWidth !== null
    ) {
      // 即使禁用了调整，也要应用 Key 列特殊宽度
      return colIndex === 0
        ? props.defaultColumnWidth.key || 120
        : props.defaultColumnWidth.others || 100;
    }
    return props.defaultColumnWidth; // 默认值（Number类型）
  };

  /**
   * 获取行高
   * @param {number} rowIndex - 行索引
   * @returns {number} 行高（像素）
   */
  const getRowHeight = (rowIndex) => {
    if (props.enableRowResize && rowHeightComposable) {
      return rowHeightComposable.getRowHeight(rowIndex);
    }
    return props.defaultRowHeight; // 禁用行高调整时使用固定值
  };

  return {
    getColumnWidth,
    getRowHeight,
  };
}
