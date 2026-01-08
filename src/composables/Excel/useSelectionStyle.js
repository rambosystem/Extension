/**
 * 选区样式管理 Composable
 *
 * 负责计算选区边框样式类和拖拽填充区域样式类
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').ComputedRef} context.normalizedSelection - 归一化选区
 * @param {Function} context.isInSelection - 判断是否在选区内
 * @param {Function} context.isInDragArea - 判断是否在拖拽填充区域内
 * @param {Object} context.fillHandleComposable - 填充手柄 composable
 * @param {Object} context.props - 组件 props
 * @returns {Object} 返回样式类计算方法
 */
export function useSelectionStyle({
  normalizedSelection,
  isInSelection,
  isInDragArea,
  fillHandleComposable,
  props,
}) {
  /**
   * 获取选区边界的 Class
   * 我们将返回具体的方位组合，以便 CSS 使用 box-shadow 渲染
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Array<string>} 样式类数组
   */
  const getSelectionBorderClass = (row, col) => {
    if (!isInSelection(row, col)) return [];

    const selection = normalizedSelection.value;
    if (!selection) return [];

    const classes = [];
    // 判断四个方向是否是边界
    if (row === selection.minRow) classes.push("selection-top");
    if (row === selection.maxRow) classes.push("selection-bottom");
    if (col === selection.minCol) classes.push("selection-left");
    if (col === selection.maxCol) classes.push("selection-right");

    return classes;
  };

  /**
   * 判断是否为选区的右下角（用于显示填充手柄）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean}
   */
  const isSelectionBottomRight = (row, col) => {
    if (!normalizedSelection.value) return false;
    const { maxRow, maxCol } = normalizedSelection.value;
    return row === maxRow && col === maxCol;
  };

  /**
   * 获取拖拽填充区域边界的 Class
   * 只在边界绘制虚线边框，避免相邻单元格边框重叠
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Array<string>} 样式类数组
   */
  const getDragTargetBorderClass = (row, col) => {
    if (!props.enableFillHandle || !fillHandleComposable) return [];
    if (!isInDragArea(row, col)) return [];

    const { dragStartCell, dragEndCell } = fillHandleComposable;
    if (!dragStartCell.value || !dragEndCell.value) return [];

    const startRow = dragStartCell.value.row;
    const endRow = dragEndCell.value.row;
    const colIndex = dragStartCell.value.col;

    // 只处理拖拽列
    if (col !== colIndex) return [];

    const classes = [];
    // 判断边界：顶部是第一个拖拽单元格，底部是最后一个拖拽单元格
    // 注意：拖拽区域从 startRow + 1 开始
    if (row === startRow + 1) classes.push("drag-target-top");
    if (row === endRow) classes.push("drag-target-bottom");
    // 左右边界都是该列
    classes.push("drag-target-left");
    classes.push("drag-target-right");

    return classes;
  };

  return {
    getSelectionBorderClass,
    isSelectionBottomRight,
    getDragTargetBorderClass,
  };
}
