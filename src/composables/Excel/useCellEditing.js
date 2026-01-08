import { ref, nextTick } from "vue";

/**
 * 单元格编辑管理 Composable
 *
 * 负责管理单元格的编辑状态、输入框引用和编辑相关操作
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {import('vue').Ref} context.activeCell - 活动单元格
 * @param {Function} context.startSingleSelection - 开始单格选择
 * @param {Function} context.saveHistory - 保存历史记录
 * @param {Function} context.moveActiveCell - 移动活动单元格
 * @param {Function} context.getMaxRows - 获取最大行数
 * @param {Function} context.getMaxCols - 获取最大列数
 * @param {import('vue').Ref} context.containerRef - 容器引用
 * @returns {Object} 返回编辑相关的方法和状态
 */
export function useCellEditing({
  tableData,
  activeCell,
  startSingleSelection,
  saveHistory,
  moveActiveCell,
  getMaxRows,
  getMaxCols,
  containerRef,
}) {
  const editingCell = ref(null); // { row, col }
  let beforeEditSnapshot = null;

  // DOM Refs for Inputs
  const cellInputRefs = new Map();

  /**
   * 设置输入框引用
   * @param {HTMLElement} el - DOM 元素
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const setInputRef = (el, row, col) => {
    if (!el) return;
    const key = `${row}-${col}`;
    cellInputRefs.set(key, el);
  };

  /**
   * 判断是否正在编辑指定单元格
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean}
   */
  const isEditing = (row, col) =>
    editingCell.value?.row === row && editingCell.value?.col === col;

  /**
   * 开始编辑单元格
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {boolean} selectAll - 是否全选文本，默认 true
   */
  const startEdit = (row, col, selectAll = true) => {
    // 边界检查
    if (row < 0 || row >= getMaxRows() || col < 0 || col >= getMaxCols()) {
      console.warn(`Invalid cell position: row=${row}, col=${col}`);
      return;
    }

    beforeEditSnapshot = tableData.value[row][col];
    editingCell.value = { row, col };
    startSingleSelection(row, col); // 确保编辑时选中该单元格

    // 使用 nextTick 确保 DOM 更新后再聚焦
    nextTick(() => {
      const key = `${row}-${col}`;
      const inputEl = cellInputRefs.get(key);
      if (inputEl) {
        inputEl.focus();
        if (selectAll) {
          inputEl.select();
        } else {
          const length = inputEl.value.length;
          inputEl.setSelectionRange(length, length);
        }
      }
    });
  };

  /**
   * 停止编辑单元格
   */
  const stopEdit = () => {
    if (!editingCell.value) return;
    const { row, col } = editingCell.value;

    if (beforeEditSnapshot !== tableData.value[row][col]) {
      saveHistory(tableData.value); // 数据变动保存历史
    }

    editingCell.value = null;
    beforeEditSnapshot = null;
    containerRef.value?.focus();
  };

  /**
   * 取消编辑单元格
   */
  const cancelEdit = () => {
    if (editingCell.value && beforeEditSnapshot !== null) {
      const { row, col } = editingCell.value;
      tableData.value[row][col] = beforeEditSnapshot;
    }
    editingCell.value = null;
    beforeEditSnapshot = null;
    containerRef.value?.focus();
  };

  /**
   * 处理输入框 Enter 键
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleInputEnter = (event) => {
    stopEdit();
    moveActiveCell(event.shiftKey ? -1 : 1, 0, getMaxRows(), getMaxCols());
    nextTick(() => containerRef.value?.focus());
  };

  /**
   * 处理输入框 Tab 键
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleInputTab = (event) => {
    stopEdit();
    moveActiveCell(0, event.shiftKey ? -1 : 1, getMaxRows(), getMaxCols());
    nextTick(() => containerRef.value?.focus());
  };

  /**
   * 清理输入框引用
   */
  const clearInputRefs = () => {
    cellInputRefs.clear();
  };

  return {
    editingCell,
    isEditing,
    startEdit,
    stopEdit,
    cancelEdit,
    setInputRef,
    handleInputEnter,
    handleInputTab,
    clearInputRefs,
  };
}
