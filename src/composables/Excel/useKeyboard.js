import { KEY_CODES, MODIFIER_KEYS, NAV_DIRECTION } from "./constants.js";

/**
 * 检测是否为 Mac 平台
 * @returns {boolean}
 */
export const isMacPlatform = () => {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
};

/**
 * 获取当前平台的修饰键符号
 * Mac 平台返回 ⌘，Windows/Linux 平台返回 Ctrl
 * @returns {string} 修饰键符号
 */
export const getModifierKey = () => {
  return isMacPlatform() ? "⌘" : "Ctrl";
};

/**
 * 获取 Alt 键的显示符号
 * Mac 平台返回 ⌥，Windows/Linux 平台返回 Alt
 * @returns {string} Alt 键符号
 */
export const getAltKey = () => {
  return isMacPlatform() ? "⌥" : "Alt";
};

/**
 * 获取 Shift 键的显示符号
 * Mac 平台返回 ⇧，Windows/Linux 平台返回 Shift
 * @returns {string} Shift 键符号
 */
export const getShiftKey = () => {
  return isMacPlatform() ? "⇧" : "Shift";
};

/**
 * 获取 Delete 键的显示符号
 * Mac 平台返回 ⌫，Windows/Linux 平台返回 Delete
 * @returns {string} Delete 键符号
 */
export const getDeleteKey = () => {
  return isMacPlatform() ? "⌫" : "Delete";
};

/**
 * 规范化主键显示符号（根据平台）
 * @param {string} key - 主键，如 "Enter", "Delete", "A" 等
 * @returns {string} 规范化后的主键符号
 */
const normalizeKeySymbol = (key) => {
  if (!key) return key;

  const keyLower = key.toLowerCase();
  const isMac = isMacPlatform();

  // Mac 平台特殊键符号映射
  if (isMac) {
    if (keyLower === "delete" || keyLower === "backspace") {
      return "⌫";
    }
    // 其他特殊键可以在这里添加
  }

  // Windows/Linux 平台保持原样
  return key;
};

/**
 * 构建快捷键字符串（用于显示）
 * 根据平台自动使用正确的修饰键符号
 * @param {string} key - 主键，如 "Enter", "Delete", "A" 等
 * @param {Object} options - 选项
 * @param {boolean} options.alt - 是否包含 Alt 键
 * @param {boolean} options.shift - 是否包含 Shift 键
 * @returns {string} 格式化后的快捷键字符串，如 "⌘+⌥+A" 或 "Ctrl+Alt+A"
 */
export const buildShortcut = (key, options = {}) => {
  const parts = [];

  // 添加修饰键（Mac 使用 ⌘，其他平台使用 Ctrl）
  parts.push(getModifierKey());

  // 添加 Alt 键（Mac 使用 ⌥，其他平台使用 Alt）
  if (options.alt) {
    parts.push(getAltKey());
  }

  // 添加 Shift 键（Mac 使用 ⇧，其他平台使用 Shift）
  if (options.shift) {
    parts.push(getShiftKey());
  }

  // 添加主键（根据平台规范化）
  parts.push(normalizeKeySymbol(key));

  return parts.join("+");
};

/**
 * 解析快捷键字符串
 * 支持格式：Ctrl+Alt+A, Cmd+Shift+B, Ctrl+A 等
 * @param {string} shortcut - 快捷键字符串，如 "Ctrl+Alt+A"
 * @returns {Object} 解析后的快捷键对象 { ctrl: boolean, alt: boolean, shift: boolean, meta: boolean, key: string }
 */
const parseShortcut = (shortcut) => {
  if (!shortcut || typeof shortcut !== "string") {
    return null;
  }

  const parts = shortcut.split("+").map((p) => p.trim());
  const result = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: null,
  };

  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    if (lowerPart === "ctrl" || lowerPart === "control") {
      result.ctrl = true;
    } else if (lowerPart === "cmd" || lowerPart === "meta") {
      result.meta = true;
    } else if (lowerPart === "alt") {
      result.alt = true;
    } else if (lowerPart === "shift") {
      result.shift = true;
    } else {
      // 最后一个非修饰键部分作为主键
      result.key = part.toLowerCase();
    }
  }

  return result.key ? result : null;
};

/**
 * 规范化快捷键字符串，根据平台显示正确的修饰键
 * Mac 平台：将 Ctrl 转换为 ⌘，Alt 转换为 ⌥，Shift 转换为 ⇧，Delete 转换为 ⌫
 * Windows/Linux 平台：将 Cmd 转换为 Ctrl，保持 Alt、Shift 和 Delete 不变
 *
 * 例如：
 * - "Ctrl+Alt+A" 在 Mac 上显示为 "⌘+⌥+A"
 * - "Cmd+Alt+A" 在 Windows 上显示为 "Ctrl+Alt+A"
 * - "Ctrl+Shift+Z" 在 Mac 上显示为 "⌘+⇧+Z"
 * - "Ctrl+Delete" 在 Mac 上显示为 "⌘+⌫"
 *
 * @param {string} shortcut - 原始快捷键字符串，如 "Ctrl+Alt+A"
 * @returns {string} 规范化后的快捷键字符串
 */
export const normalizeShortcutForPlatform = (shortcut) => {
  if (!shortcut || typeof shortcut !== "string") {
    return shortcut;
  }

  const isMac = isMacPlatform();
  const parts = shortcut.split("+").map((p) => p.trim());

  return parts
    .map((part) => {
      const lowerPart = part.toLowerCase();
      if (isMac) {
        // Mac 平台：将 Ctrl 转换为 ⌘ 符号
        if (lowerPart === "ctrl" || lowerPart === "control") {
          return "⌘";
        }
        // 将 Cmd 转换为 ⌘ 符号
        if (lowerPart === "cmd" || lowerPart === "meta") {
          return "⌘";
        }
        // 将 Alt 转换为 ⌥ 符号
        if (lowerPart === "alt" || lowerPart === "option") {
          return "⌥";
        }
        // 将 Shift 转换为 ⇧ 符号
        if (lowerPart === "shift") {
          return "⇧";
        }
        // 将 Delete/Backspace 转换为 ⌫ 符号
        if (lowerPart === "delete" || lowerPart === "backspace") {
          return "⌫";
        }
      } else {
        // Windows/Linux 平台：将 Cmd 转换为 Ctrl
        if (lowerPart === "cmd" || lowerPart === "meta") {
          return "Ctrl";
        }
        // 保持 Ctrl 不变
        if (lowerPart === "ctrl" || lowerPart === "control") {
          return "Ctrl";
        }
        // Alt、Shift 和 Delete 保持不变
        if (lowerPart === "alt" || lowerPart === "option") {
          return "Alt";
        }
        if (lowerPart === "shift") {
          return "Shift";
        }
        if (lowerPart === "delete" || lowerPart === "backspace") {
          return "Delete";
        }
      }
      // 其他修饰键和主键保持不变
      return part;
    })
    .join("+");
};

/**
 * 检查键盘事件是否匹配快捷键配置
 * 支持 Mac 系统：Ctrl 和 Cmd 可以互转
 * @param {KeyboardEvent} event - 键盘事件
 * @param {Object} shortcutConfig - 解析后的快捷键配置
 * @returns {boolean}
 */
const matchShortcut = (event, shortcutConfig) => {
  if (!shortcutConfig) return false;

  // 检测是否为 Mac 系统
  const isMac = isMacPlatform();

  // 检查修饰键
  // Mac 系统：Ctrl 和 Cmd 可以互转（视为等价）
  let modifierMatch;
  if (isMac) {
    // Mac: Ctrl 和 Cmd 可以互转
    const wantsCtrlOrCmd = shortcutConfig.ctrl || shortcutConfig.meta;
    const hasCtrlOrCmd = event.ctrlKey || event.metaKey;
    modifierMatch = wantsCtrlOrCmd ? hasCtrlOrCmd : !hasCtrlOrCmd;
  } else {
    // Windows/Linux: 严格匹配
    const ctrlMatch = shortcutConfig.ctrl ? event.ctrlKey : !event.ctrlKey;
    const metaMatch = shortcutConfig.meta ? event.metaKey : !event.metaKey;
    modifierMatch = ctrlMatch && metaMatch;
  }

  const altMatch = shortcutConfig.alt ? event.altKey : !event.altKey;
  const shiftMatch = shortcutConfig.shift ? event.shiftKey : !event.shiftKey;

  // 检查主键（不区分大小写）
  // 支持 event.key 和 event.code 两种匹配方式
  // event.key 是实际按下的字符（如 "a", "A"）
  // event.code 是物理按键代码（如 "KeyA"）
  const eventKeyLower = event.key?.toLowerCase() || "";
  const eventCodeLower = event.code?.toLowerCase() || "";
  const configKeyLower = shortcutConfig.key?.toLowerCase() || "";

  // 匹配 event.key（直接字符匹配）
  const keyMatchByKey = eventKeyLower === configKeyLower;

  // 匹配 event.code（物理按键匹配，如 "KeyA" -> "a"）
  // 从 "KeyA" 中提取 "a"，从 "Digit1" 中提取 "1"
  const codeKeyMatch =
    eventCodeLower.replace(/^key/, "").replace(/^digit/, "") === configKeyLower;

  // 完整 code 匹配（如 "Enter", "Delete" 等特殊键）
  const codeFullMatch = eventCodeLower === configKeyLower;

  const keyMatch = keyMatchByKey || codeKeyMatch || codeFullMatch;

  return modifierMatch && altMatch && shiftMatch && keyMatch;
};

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
 * @param {Array} context.customMenuItems - 自定义菜单项配置数组（可选）
 * @param {Function} context.handleCustomAction - 处理自定义菜单项的函数（可选）
 * @param {Function} context.createMenuContext - 创建菜单上下文的函数（可选）
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
    customMenuItems = [],
    handleCustomAction,
    createMenuContext,
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
    // 同时检查 event.key 和 event.code，确保跨平台兼容性
    const isEnterKey = event.key === KEY_CODES.ENTER || event.code === "Enter";
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isCtrlEnter = isCtrlOrCmd && isEnterKey && !event.shiftKey;

    if (!isCtrlEnter || !handleInsertRowBelow || !activeCell.value) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    // 使用统一的插入行处理函数（与下拉菜单一致）
    const rowIndex = activeCell.value.row;
    handleInsertRowBelow(rowIndex);

    return true;
  };

  /**
   * 处理 Ctrl+Delete 删除行
   * 优化：如果选区包含多行，则一次删除所有选中的行
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleDeleteRowKey = (event) => {
    // 检查是否为 Ctrl+Delete (Windows/Linux) 或 Cmd+Delete (Mac)
    // 同时检查 event.key 和 event.code，确保跨平台兼容性
    // event.key 是逻辑键值（可能因平台而异）
    // event.code 是物理按键代码（更可靠）
    // 注意：在 Mac 上，Delete 键实际上是 Backspace 的功能
    // 真正的删除键是 Fn+Delete，但 Cmd+Delete 应该也能工作
    const isDeleteKey =
      event.key === KEY_CODES.DELETE ||
      event.code === "Delete" ||
      event.key === KEY_CODES.BACKSPACE ||
      event.code === "Backspace";
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isCtrlDelete =
      isCtrlOrCmd && isDeleteKey && !event.shiftKey && !event.altKey;

    if (!isCtrlDelete || !handleDeleteRow || !activeCell.value) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // 检查是否有选区，且选区包含多行
    const range = normalizedSelection.value;
    if (range && range.minRow !== range.maxRow) {
      // 选区包含多行，获取所有需要删除的行索引
      const rowIndices = [];
      for (let row = range.minRow; row <= range.maxRow; row++) {
        rowIndices.push(row);
      }
      // 使用多行删除函数
      handleDeleteRow(rowIndices);
    } else {
      // 单行删除：使用活动单元格所在的行
      const rowIndex = activeCell.value.row;
      handleDeleteRow(rowIndex);
    }

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
   * 处理自定义菜单项快捷键
   *
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否已处理
   */
  const handleCustomShortcuts = (event) => {
    if (!customMenuItems || customMenuItems.length === 0) {
      return false;
    }

    if (!handleCustomAction || !createMenuContext || !activeCell.value) {
      return false;
    }

    // 遍历所有自定义菜单项，检查是否有匹配的快捷键
    for (const item of customMenuItems) {
      if (!item.shortcut) continue;

      // 解析快捷键
      const shortcutConfig = parseShortcut(item.shortcut);
      if (!shortcutConfig) {
        console.warn(
          `useKeyboard: Failed to parse shortcut "${item.shortcut}" for menu item "${item.id}"`
        );
        continue;
      }

      // 检查是否匹配
      if (matchShortcut(event, shortcutConfig)) {
        // 创建上下文并验证菜单项是否应该显示
        const context = createMenuContext(activeCell.value.row);

        // 如果有 validate 函数，检查是否通过验证
        if (typeof item.validate === "function") {
          try {
            if (!item.validate(context)) {
              continue; // 验证失败，跳过这个菜单项
            }
          } catch (error) {
            console.warn(
              `useKeyboard: validate function error for menu item "${item.id}":`,
              error
            );
            continue;
          }
        }

        // 触发自定义菜单项操作
        event.preventDefault();
        event.stopPropagation();
        handleCustomAction({
          id: item.id,
          context,
        });
        return true;
      }
    }

    return false;
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
    if (handleCustomShortcuts(event)) return; // 自定义菜单项快捷键
    if (handleNavigation(event)) return;
    if (handleDelete(event)) return; // Delete/Backspace 删除选区内容
    if (handleDirectTyping(event)) return;
  };

  return {
    handleKeydown,
  };
}
