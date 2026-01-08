/**
 * 选区样式管理 Composable
 *
 * 负责计算选区边框样式类和拖拽填充区域样式类
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').ComputedRef} context.normalizedSelection - 归一化选区
 * @param {import('vue').Ref} context.multiSelections - 多选列表
 * @param {import('vue').Ref} context.isMultipleMode - 当前选择模式（true = MULTIPLE，false = SINGLE）
 * @param {import('vue').Ref} context.isSelecting - 是否正在选择
 * @param {Function} context.isInSelection - 判断是否在选区内
 * @param {Function} context.isInMultiSelectionOnly - 判断是否仅在多选列表中（不在当前选区）
 * @param {Function} context.shouldUseMultiSelectionStyle - 判断是否应该使用多选背景色
 * @param {Function} context.isInDragArea - 判断是否在拖拽填充区域内
 * @param {Object} context.fillHandleComposable - 填充手柄 composable
 * @param {Object} context.props - 组件 props
 * @returns {Object} 返回样式类计算方法
 */
export function useSelectionStyle({
  normalizedSelection,
  multiSelections,
  isMultipleMode,
  isSelecting,
  isInSelection,
  isInMultiSelectionOnly,
  shouldUseMultiSelectionStyle,
  isInDragArea,
  fillHandleComposable,
  props,
}) {
  /**
   * 获取选区边界的 Class
   *
   * 根据选择模式决定渲染方式：
   * - MULTIPLE 模式：不显示边框，只显示背景色
   * - SINGLE 模式：显示边框和背景色
   *
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Array<string>} 样式类数组
   */
  const getSelectionBorderClass = (row, col) => {
    const classes = [];

    // MULTIPLE 模式：不显示边框，只显示背景色
    // 判断方式：优先检查 isMultipleMode 标识（最可靠），其次检查 multiSelections
    // 注意：isMultipleMode 是一个 ref，需要访问 .value
    const isInMultipleMode =
      isMultipleMode?.value === true || multiSelections?.value?.length > 0;

    if (isInMultipleMode) {
      return classes;
    }

    // SINGLE 模式：为当前选区添加边框
    const selection = normalizedSelection.value;
    if (!selection) {
      return classes; // 明确返回空数组
    }

    // 检查单元格是否在当前选区内
    const inCurrentSelection =
      row >= selection.minRow &&
      row <= selection.maxRow &&
      col >= selection.minCol &&
      col <= selection.maxCol;

    if (!inCurrentSelection) {
      // 单元格不在选区内，明确返回空数组（不显示边框）
      return classes; // 明确返回空数组
    }

    // 单元格在选区内，判断边界
    const isTop = row === selection.minRow;
    const isBottom = row === selection.maxRow;
    const isLeft = col === selection.minCol;
    const isRight = col === selection.maxCol;

    // 只有边界单元格才添加边框类，内部单元格不添加任何边框类
    if (isTop) classes.push("selection-top");
    if (isBottom) classes.push("selection-bottom");
    if (isLeft) classes.push("selection-left");
    if (isRight) classes.push("selection-right");

    return classes;
  };

  /**
   * 判断是否为选区的右下角（用于显示填充手柄）
   * MULTIPLE 模式时不显示填充手柄
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean}
   */
  const isSelectionBottomRight = (row, col) => {
    // MULTIPLE 模式：不显示填充手柄
    // 判断方式：优先检查 isMultipleMode 标识（最可靠），其次检查 multiSelections
    // 注意：isMultipleMode 是一个 ref，需要访问 .value
    const isInMultipleMode =
      isMultipleMode?.value === true || multiSelections?.value?.length > 0;

    if (isInMultipleMode) {
      return false;
    }

    // SINGLE 模式：显示填充手柄
    if (!normalizedSelection.value) return false;
    const { maxRow, maxCol } = normalizedSelection.value;
    return row === maxRow && col === maxCol;
  };

  /**
   * 获取多选模式下拖选边界的 Class
   *
   * 在多选模式下，当正在拖选时（isSelecting），显示拖选区域的边框
   * 类似单选模式的边框渲染，但只在拖选过程中显示
   *
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Array<string>} 样式类数组
   */
  const getMultipleDragBorderClass = (row, col) => {
    const classes = [];

    // 只在多选模式且正在拖选时显示边框
    const isInMultipleMode =
      isMultipleMode?.value === true || multiSelections?.value?.length > 0;

    if (!isInMultipleMode || !isSelecting?.value) {
      return classes;
    }

    // 获取当前拖选的选区
    const selection = normalizedSelection.value;
    if (!selection) {
      return classes;
    }

    // 检查单元格是否在当前拖选选区内
    const inCurrentDragSelection =
      row >= selection.minRow &&
      row <= selection.maxRow &&
      col >= selection.minCol &&
      col <= selection.maxCol;

    if (!inCurrentDragSelection) {
      return classes;
    }

    // 单元格在拖选选区内，判断边界
    const isTop = row === selection.minRow;
    const isBottom = row === selection.maxRow;
    const isLeft = col === selection.minCol;
    const isRight = col === selection.maxCol;

    // 只有边界单元格才添加边框类，内部单元格不添加任何边框类
    if (isTop) classes.push("selection-top");
    if (isBottom) classes.push("selection-bottom");
    if (isLeft) classes.push("selection-left");
    if (isRight) classes.push("selection-right");

    return classes;
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
    getMultipleDragBorderClass,
  };
}
