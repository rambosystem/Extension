import { KEY_CODES, MODIFIER_KEYS, NAV_DIRECTION } from "./constants.js";

/**
 * Excel 键盘处理 Composable
 * 将键盘逻辑从组件中分离，提升可维护性
 *
 * @param {Object} context - 上下文对象
 * @param {Object} context.activeCell - 活动单元格
 * @param {Object} context.editingCell - 正在编辑的单元格
 * @param {Object} context.normalizedSelection - 归一化选区
 * @param {Function} context.moveActiveCell - 移动活动单元格函数
 * @param {Function} context.saveHistory - 保存历史函数
 * @param {Function} context.undoHistory - 撤销函数
 * @param {Function} context.redoHistory - 重做函数
 * @param {Function} context.startEdit - 开始编辑函数
 * @param {Function} context.deleteSelection - 删除选区函数
 * @param {Function} context.handleInsertRowBelow - 统一的插入行处理函数（与下拉菜单一致）
 * @param {Function} context.handleDeleteRow - 统一的删除行处理函数（与下拉菜单一致）
 * @param {Object} context.tableData - 表格数据
 * @param {Function} context.getMaxRows - 获取最大行数的函数
 * @param {Function} context.getMaxCols - 获取最大列数的函数
 * @returns {Function} handleKeydown 函数
 */
export function useKeyboard(context) {
  const {
    activeCell,
    editingCell,
    normalizedSelection,
    moveActiveCell,
    saveHistory,
    undoHistory,
    redoHistory,
    startEdit,
    deleteSelection,
    handleInsertRowBelow,
    handleDeleteRow,
    tableData,
    getMaxRows,
    getMaxCols,
  } = context;

  /**
   * 处理撤销/重做快捷键
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleUndoRedo = (event) => {
    if (!(event.ctrlKey || event.metaKey) || editingCell.value) {
      return false;
    }

    const key = event.key.toLowerCase();
    if (key === KEY_CODES.Z) {
      const newState = event.shiftKey ? redoHistory() : undoHistory();
      if (newState) {
        tableData.value = newState;
      }
      event.preventDefault();
      return true;
    }

    if (key === KEY_CODES.Y) {
      const newState = redoHistory();
      if (newState) {
        tableData.value = newState;
      }
      event.preventDefault();
      return true;
    }

    return false;
  };

  /**
   * 处理导航键
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleNavigation = (event) => {
    const navKeys = [
      KEY_CODES.ARROW_UP,
      KEY_CODES.ARROW_DOWN,
      KEY_CODES.ARROW_LEFT,
      KEY_CODES.ARROW_RIGHT,
      KEY_CODES.TAB,
      KEY_CODES.ENTER,
    ];

    if (!navKeys.includes(event.key)) {
      return false;
    }

    event.preventDefault();

    let rOff = NAV_DIRECTION.NONE;
    let cOff = NAV_DIRECTION.NONE;

    // 计算偏移量
    switch (event.key) {
      case KEY_CODES.ARROW_UP:
        rOff = NAV_DIRECTION.UP;
        break;
      case KEY_CODES.ARROW_DOWN:
      case KEY_CODES.ENTER:
        rOff =
          event.shiftKey && event.key === KEY_CODES.ENTER
            ? NAV_DIRECTION.UP
            : NAV_DIRECTION.DOWN;
        break;
      case KEY_CODES.ARROW_LEFT:
        cOff = NAV_DIRECTION.LEFT;
        break;
      case KEY_CODES.ARROW_RIGHT:
      case KEY_CODES.TAB:
        cOff =
          event.shiftKey && event.key === KEY_CODES.TAB
            ? NAV_DIRECTION.LEFT
            : NAV_DIRECTION.RIGHT;
        break;
    }

    // 方向键允许 Shift 进行选择，Tab/Enter 通常不允许
    const isArrow = event.key.startsWith("Arrow");
    moveActiveCell(
      rOff,
      cOff,
      getMaxRows(),
      getMaxCols(),
      event.shiftKey && isArrow
    );

    return true;
  };

  /**
   * 处理 Ctrl+Enter 插入行
   *
   * 使用统一的插入行处理函数，与下拉菜单的插入逻辑完全一致
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleInsertRow = (event) => {
    // 检查是否为 Ctrl+Enter (Windows/Linux) 或 Cmd+Enter (Mac)
    const isCtrlEnter =
      (event.ctrlKey || event.metaKey) &&
      event.key === KEY_CODES.ENTER &&
      !event.shiftKey;

    if (!isCtrlEnter || !handleInsertRowBelow || !activeCell.value) {
      return false;
    }

    event.preventDefault();

    // 使用统一的插入行处理函数（与下拉菜单一致）
    const rowIndex = activeCell.value.row;
    handleInsertRowBelow(rowIndex);

    return true;
  };

  /**
   * 处理 Ctrl+Delete 删除行
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleDeleteRowKey = (event) => {
    // 检查是否为 Ctrl+Delete (Windows/Linux) 或 Cmd+Delete (Mac)
    const isCtrlDelete =
      (event.ctrlKey || event.metaKey) &&
      event.key === KEY_CODES.DELETE &&
      !event.shiftKey;

    if (!isCtrlDelete || !handleDeleteRow || !activeCell.value) {
      return false;
    }

    event.preventDefault();

    // 使用统一的删除行处理函数（与下拉菜单一致）
    const rowIndex = activeCell.value.row;
    handleDeleteRow(rowIndex);

    return true;
  };

  /**
   * 处理删除键（删除选区内容）
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleDelete = (event) => {
    // 如果按了 Ctrl/Cmd，不处理（可能是删除行）
    if (event.ctrlKey || event.metaKey) {
      return false;
    }

    if (event.key !== KEY_CODES.DELETE && event.key !== KEY_CODES.BACKSPACE) {
      return false;
    }

    const range = normalizedSelection.value;
    if (!range) {
      return false;
    }

    event.preventDefault();
    saveHistory(tableData.value);
    deleteSelection(range);
    return true;
  };

  /**
   * 处理直接输入
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleDirectTyping = (event) => {
    // 检查是否为可输入字符
    const isTypableChar =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey;

    if (!isTypableChar || !activeCell.value) {
      return false;
    }

    const { row, col } = activeCell.value;
    const maxRows = getMaxRows();
    const maxCols = getMaxCols();

    // 边界检查
    if (
      row < 0 ||
      row >= maxRows ||
      col < 0 ||
      col >= maxCols ||
      !tableData.value[row]
    ) {
      return false;
    }

    event.preventDefault();
    saveHistory(tableData.value);
    tableData.value[row][col] = event.key;
    startEdit(row, col, false);
    return true;
  };

  /**
   * 主键盘处理函数
   *
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleKeydown = (event) => {
    // 忽略输入法组合事件
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    if (!activeCell.value) {
      return;
    }

    // 按优先级处理各种键盘事件
    if (handleUndoRedo(event)) return;
    if (editingCell.value) return; // 编辑模式下不处理其他键
    if (handleInsertRow(event)) return; // Ctrl+Enter 插入行
    if (handleDeleteRowKey(event)) return; // Ctrl+Delete 删除行
    if (handleNavigation(event)) return;
    if (handleDelete(event)) return; // Delete/Backspace 删除选区内容
    if (handleDirectTyping(event)) return;
  };

  return {
    handleKeydown,
  };
}
