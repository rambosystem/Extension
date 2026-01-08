import { computed, nextTick } from "vue";

/**
 * 单元格菜单位置管理 Composable
 *
 * 负责计算和管理单元格菜单按钮的显示位置和上下文
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref<Object|null>} context.editingCell - 正在编辑的单元格
 * @param {import('vue').Ref<boolean>} context.isSelecting - 是否正在选择
 * @param {import('vue').Ref<boolean>} context.isMultipleMode - 是否处于多选模式
 * @param {import('vue').Ref<Object|null>} context.activeCell - 活动单元格
 * @param {import('vue').ComputedRef<Object|null>} context.normalizedSelection - 归一化选区
 * @param {import('vue').Ref<Array>} context.multiSelections - 多选列表
 * @param {import('vue').Ref<Array>} context.tableData - 表格数据
 * @param {Function} context.updateCell - 更新单元格函数
 * @param {Function} context.notifyDataChange - 通知数据变化函数
 * @param {Function} context.getData - 获取数据函数
 * @param {Function} context.setDataWithSync - 设置数据函数（带同步）
 * @returns {Object} 返回菜单位置相关的方法和计算属性
 */
export function useCellMenuPosition(context) {
  const {
    editingCell,
    isSelecting,
    isMultipleMode,
    activeCell,
    normalizedSelection,
    multiSelections,
    tableData,
    updateCell,
    notifyDataChange,
    getData,
    setDataWithSync,
  } = context;

  /**
   * 获取多选模式下菜单按钮应该显示的位置
   *
   * 多选模式：显示在最后一个选区的最后一个单元格（maxRow, maxCol）
   *
   * @returns {Object|null} { row, col } 或 null
   * @description 只考虑 multiSelections，不考虑当前选区
   */
  const getLastCellInMultiSelections = computed(() => {
    // 只考虑多选列表中的选区，不合并当前选区
    if (!multiSelections.value || multiSelections.value.length === 0) {
      return null;
    }

    // 获取多选列表中的最后一个选区
    const lastSelection =
      multiSelections.value[multiSelections.value.length - 1];

    // 返回该选区的最后一个cell（右下角）
    return {
      row: lastSelection.maxRow,
      col: lastSelection.maxCol,
    };
  });

  /**
   * 计算菜单按钮应该显示的位置
   *
   * 返回 { row, col } 或 null
   *
   * 显示条件：
   * 1. 不在编辑状态
   * 2. 不在选择过程中（isSelecting === false）
   *
   * 显示逻辑：
   * - 单选模式：显示在选区的最后一个单元格（右下角）
   *   - 如果框选了多个单元格，菜单显示在选区右下角（maxRow, maxCol）
   *   - 如果是单单元格，显示在活动单元格
   * - 多选模式：显示在最后一个选区的最后一个单元格（maxRow, maxCol）
   */
  const cellMenuPosition = computed(() => {
    // 如果正在编辑，不显示菜单
    if (editingCell.value) {
      return null;
    }

    // 如果正在选择过程中，隐藏菜单按钮（避免位置不正确）
    if (isSelecting.value) {
      return null;
    }

    // ==================== 多选模式 ====================
    if (isMultipleMode.value) {
      // 多选模式：显示在最后一个选区的最后一个单元格
      const lastCell = getLastCellInMultiSelections.value;
      if (lastCell) {
        return lastCell;
      }
      // 如果多选模式下没有选区，回退到活动单元格
      if (activeCell.value) {
        return {
          row: activeCell.value.row,
          col: activeCell.value.col,
        };
      }
      return null;
    }

    // ==================== 单选模式 ====================
    // 单选模式：显示在选区的最后一个单元格（右下角）
    const selection = normalizedSelection.value;
    if (selection) {
      // 检查是否是多个单元格的选区
      const isMultiCellSelection =
        selection.minRow !== selection.maxRow ||
        selection.minCol !== selection.maxCol;

      // 如果是多个单元格的选区，菜单显示在右下角（maxRow, maxCol）
      if (isMultiCellSelection) {
        return {
          row: selection.maxRow,
          col: selection.maxCol,
        };
      }
    }

    // 单单元格或没有选区时，显示在活动单元格
    if (activeCell.value) {
      return {
        row: activeCell.value.row,
        col: activeCell.value.col,
      };
    }

    return null;
  });

  /**
   * 判断是否应该显示单元格菜单按钮
   *
   * @param {number} rowIndex - 行索引
   * @param {number} colIndex - 列索引
   * @returns {boolean}
   */
  const shouldShowCellMenu = (rowIndex, colIndex) => {
    const position = cellMenuPosition.value;
    if (!position) {
      return false;
    }
    return position.row === rowIndex && position.col === colIndex;
  };

  /**
   * 创建菜单上下文对象
   * 提供给自定义菜单项的验证和执行函数使用
   *
   * @param {number} rowIndex - 行索引
   * @returns {Object} 菜单上下文对象
   */
  const createMenuContext = (rowIndex) => {
    // 在多选模式下，使用最后一个选区；否则使用当前选区
    let effectiveSelection = normalizedSelection.value;

    if (
      isMultipleMode.value &&
      multiSelections.value &&
      multiSelections.value.length > 0
    ) {
      // 使用多选列表中的最后一个选区
      effectiveSelection =
        multiSelections.value[multiSelections.value.length - 1];
    }

    return {
      normalizedSelection: effectiveSelection,
      multiSelections: multiSelections.value, // 添加多选列表信息
      isMultipleMode: isMultipleMode.value, // 添加多选模式标识
      activeCell: activeCell.value,
      rowIndex,
      tableData: tableData.value,
      updateCell: (row, col, value) => {
        updateCell(row, col, value);
        // 使用 nextTick 确保数据更新后再通知变化
        nextTick(() => {
          notifyDataChange();
        });
      },
      getData: () => getData(),
      setData: (data) => {
        setDataWithSync(data);
      },
    };
  };

  return {
    cellMenuPosition,
    shouldShowCellMenu,
    createMenuContext,
  };
}
