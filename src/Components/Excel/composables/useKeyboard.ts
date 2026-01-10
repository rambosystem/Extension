import { KEY_CODES, NAV_DIRECTION } from "./constants";
import type { Ref } from "vue";
import type { CellPosition, SelectionRange } from "./types";
import type { MenuContext } from "./useCellMenuPosition";
import {
  HistoryActionType,
  type CellChange,
  type SaveHistoryOptions,
  type HistoryRestoreResult,
} from "./useHistory";
import { handleUndoRedoOperation } from "../utils/undoRedoHandler";
import {
  handleInsertRowOperation,
  handleDeleteRowOperation,
  type RowOperationHandlerOptions,
} from "../utils/rowOperationHandler";

/**
 * 自定义菜单项配置
 */
export interface CustomMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  validate?: (context: MenuContext) => boolean;
  disabled?: (context: MenuContext) => boolean;
}

/**
 * 解析后的快捷键配置
 */
interface ParsedShortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string | null;
}

/**
 * useKeyboard 选项
 */
export interface UseKeyboardOptions {
  activeCell: Ref<CellPosition | null>;
  editingCell: Ref<CellPosition | null>;
  normalizedSelection: Ref<SelectionRange | null>;
  moveActiveCell: (
    rOffset: number,
    cOffset: number,
    maxRows: number,
    maxCols: number,
    extendSelection?: boolean
  ) => void;
  saveHistory: (state: any, options?: SaveHistoryOptions) => void;
  undoHistory: () => HistoryRestoreResult | null;
  redoHistory: () => HistoryRestoreResult | null;
  isUndoRedoInProgress?: () => boolean;
  startEdit: (
    row: number,
    col: number,
    selectAll?: boolean,
    initialValue?: string
  ) => void;
  deleteSelection: (range: SelectionRange) => void;
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  insertRowBelow: (rowIndex: number) => void;
  deleteRow: (rowIndex: number) => void;
  startSingleSelection: (row: number, col: number) => void;
  getMaxRows: () => number;
  getMaxCols: () => number;
  customMenuItems?: CustomMenuItem[];
  handleCustomAction?: (payload: { id: string; context: MenuContext }) => void;
  createMenuContext?: (rowIndex: number) => MenuContext;
  copyToClipboard?: () => Promise<boolean>;
  pasteFromClipboard?: () => Promise<boolean>;
  clearSelection?: () => void;
  notifyDataChange?: () => void;
  exitCopyMode?: () => void;
  copiedRange?: Ref<SelectionRange | null>;
}

/**
 * useKeyboard 返回值
 */
export interface UseKeyboardReturn {
  handleKeydown: (event: KeyboardEvent) => void;
}

/**
 * 检测是否为 Mac 平台
 */
export const isMacPlatform = (): boolean => {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
};

/**
 * 获取当前平台的修饰键符号
 */
export const getModifierKey = (): string => {
  return isMacPlatform() ? "⌘" : "Ctrl";
};

/**
 * 获取 Alt 键的显示符号
 */
export const getAltKey = (): string => {
  return isMacPlatform() ? "⌥" : "Alt";
};

/**
 * 获取 Shift 键的显示符号
 */
export const getShiftKey = (): string => {
  return isMacPlatform() ? "⇧" : "Shift";
};

/**
 * 获取 Delete 键的显示符号
 */
export const getDeleteKey = (): string => {
  return isMacPlatform() ? "⌫" : "Delete";
};

/**
 * 规范化主键显示符号（根据平台）
 */
const normalizeKeySymbol = (key: string): string => {
  if (!key) return key;

  const keyLower = key.toLowerCase();
  const isMac = isMacPlatform();

  if (isMac) {
    if (keyLower === "delete" || keyLower === "backspace") {
      return "⌫";
    }
  }

  return key;
};

/**
 * 构建快捷键字符串（用于显示）
 */
export const buildShortcut = (
  key: string,
  options: { alt?: boolean; shift?: boolean } = {}
): string => {
  const parts: string[] = [];

  parts.push(getModifierKey());

  if (options.alt) {
    parts.push(getAltKey());
  }

  if (options.shift) {
    parts.push(getShiftKey());
  }

  parts.push(normalizeKeySymbol(key));

  return parts.join("+");
};

/**
 * 解析快捷键字符串
 */
const parseShortcut = (shortcut: string): ParsedShortcut | null => {
  if (!shortcut || typeof shortcut !== "string") {
    return null;
  }

  const parts = shortcut.split("+").map((p) => p.trim());
  const result: ParsedShortcut = {
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
      result.key = part.toLowerCase();
    }
  }

  return result.key ? result : null;
};

/**
 * 规范化快捷键字符串，根据平台显示正确的修饰键
 */
export const normalizeShortcutForPlatform = (shortcut: string): string => {
  if (!shortcut || typeof shortcut !== "string") {
    return shortcut;
  }

  const isMac = isMacPlatform();
  const parts = shortcut.split("+").map((p) => p.trim());

  return parts
    .map((part) => {
      const lowerPart = part.toLowerCase();
      if (isMac) {
        if (lowerPart === "ctrl" || lowerPart === "control") {
          return "⌘";
        }
        if (lowerPart === "cmd" || lowerPart === "meta") {
          return "⌘";
        }
        if (lowerPart === "alt" || lowerPart === "option") {
          return "⌥";
        }
        if (lowerPart === "shift") {
          return "⇧";
        }
        if (lowerPart === "delete" || lowerPart === "backspace") {
          return "⌫";
        }
      } else {
        if (lowerPart === "cmd" || lowerPart === "meta") {
          return "Ctrl";
        }
        if (lowerPart === "ctrl" || lowerPart === "control") {
          return "Ctrl";
        }
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
      return part;
    })
    .join("+");
};

/**
 * 检查键盘事件是否匹配快捷键配置
 */
const matchShortcut = (
  event: KeyboardEvent,
  shortcutConfig: ParsedShortcut
): boolean => {
  if (!shortcutConfig) return false;

  const isMac = isMacPlatform();

  let modifierMatch: boolean;
  if (isMac) {
    const wantsCtrlOrCmd = shortcutConfig.ctrl || shortcutConfig.meta;
    const hasCtrlOrCmd = event.ctrlKey || event.metaKey;
    modifierMatch = wantsCtrlOrCmd ? hasCtrlOrCmd : !hasCtrlOrCmd;
  } else {
    const ctrlMatch = shortcutConfig.ctrl ? event.ctrlKey : !event.ctrlKey;
    const metaMatch = shortcutConfig.meta ? event.metaKey : !event.metaKey;
    modifierMatch = ctrlMatch && metaMatch;
  }

  const altMatch = shortcutConfig.alt ? event.altKey : !event.altKey;
  const shiftMatch = shortcutConfig.shift ? event.shiftKey : !event.shiftKey;

  const eventKeyLower = event.key?.toLowerCase() || "";
  const eventCodeLower = event.code?.toLowerCase() || "";
  const configKeyLower = shortcutConfig.key?.toLowerCase() || "";

  const keyMatchByKey = eventKeyLower === configKeyLower;
  const codeKeyMatch =
    eventCodeLower.replace(/^key/, "").replace(/^digit/, "") === configKeyLower;
  const codeFullMatch = eventCodeLower === configKeyLower;

  const keyMatch = keyMatchByKey || codeKeyMatch || codeFullMatch;

  return modifierMatch && altMatch && shiftMatch && keyMatch;
};

/**
 * Excel 键盘处理 Composable
 */
export function useKeyboard({
  activeCell,
  editingCell,
  normalizedSelection,
  moveActiveCell,
  saveHistory,
  undoHistory,
  redoHistory,
  startEdit,
  deleteSelection,
  tableData,
  rows,
  columns,
  insertRowBelow,
  deleteRow,
  startSingleSelection,
  getMaxRows,
  getMaxCols,
  customMenuItems = [],
  handleCustomAction,
  createMenuContext,
  copyToClipboard,
  pasteFromClipboard,
  isUndoRedoInProgress,
  clearSelection,
  notifyDataChange,
  exitCopyMode,
  copiedRange,
}: UseKeyboardOptions): UseKeyboardReturn {
  // 准备行操作工具函数的选项
  const rowOperationOptions: RowOperationHandlerOptions = {
    tableData,
    rows,
    columns,
    activeCell,
    saveHistory,
    insertRowBelow,
    deleteRow,
    startSingleSelection,
    notifyDataChange: notifyDataChange || (() => {}),
  };
  /**
   * 处理复制快捷键（Ctrl+C / Cmd+C）
   */
  const handleCopyShortcut = (event: KeyboardEvent): boolean => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isCKey = event.key.toLowerCase() === "c";

    if (!isCtrlOrCmd || !isCKey) {
      return false;
    }

    // 如果正在编辑，让浏览器原生处理
    if (editingCell.value) {
      return false;
    }

    event.preventDefault();

    // 调用程序化复制
    if (copyToClipboard) {
      copyToClipboard().catch((error) => {
        console.error("Copy shortcut failed:", error);
      });
    }

    return true;
  };

  /**
   * 处理粘贴快捷键（Ctrl+V / Cmd+V）
   */
  const handlePasteShortcut = (event: KeyboardEvent): boolean => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isVKey = event.key.toLowerCase() === "v";

    if (!isCtrlOrCmd || !isVKey) {
      return false;
    }

    // 如果正在编辑，让浏览器原生处理
    if (editingCell.value) {
      return false;
    }

    event.preventDefault();

    // 调用程序化粘贴
    if (pasteFromClipboard) {
      pasteFromClipboard().catch((error) => {
        console.error("Paste shortcut failed:", error);
      });
    }

    return true;
  };

  /**
   * 处理撤销/重做快捷键
   */
  const handleUndoRedo = (event: KeyboardEvent): boolean => {
    if (!(event.ctrlKey || event.metaKey) || editingCell.value) {
      return false;
    }

    const key = event.key.toLowerCase();
    if (key === KEY_CODES.Z) {
      const result = event.shiftKey ? redoHistory() : undoHistory();

      // 使用公共函数处理撤销/重做操作（与菜单逻辑完全一致，公共函数内部会处理更新选区和通知数据变化）
      const success = handleUndoRedoOperation({
        result,
        tableData,
        rows,
        columns,
        activeCell,
        clearSelection,
        startSingleSelection,
        notifyDataChange,
      });

      // 如果无法撤销/重做，阻止默认行为但返回 true 表示已处理
      if (!success) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      event.preventDefault();
      return true;
    }

    if (key === KEY_CODES.Y) {
      const result = redoHistory();

      // 使用公共函数处理重做操作（与菜单逻辑完全一致，公共函数内部会处理更新选区和通知数据变化）
      const success = handleUndoRedoOperation({
        result,
        tableData,
        rows,
        columns,
        activeCell,
        clearSelection,
        startSingleSelection,
        notifyDataChange,
      });

      // 如果无法重做，阻止默认行为但返回 true 表示已处理
      if (!success) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      event.preventDefault();
      return true;
    }

    return false;
  };

  /**
   * 处理导航键
   */
  const handleNavigation = (event: KeyboardEvent): boolean => {
    const navKeys: readonly string[] = [
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

    // 如果 Enter 键配合 Ctrl/Meta 键，不应该作为导航键处理（应该由 handleInsertRow 处理）
    if (event.key === KEY_CODES.ENTER && (event.ctrlKey || event.metaKey)) {
      return false;
    }

    event.preventDefault();

    let rOff: number = NAV_DIRECTION.NONE;
    let cOff: number = NAV_DIRECTION.NONE;

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
   */
  const handleInsertRow = (event: KeyboardEvent): boolean => {
    const isEnterKey = event.key === KEY_CODES.ENTER || event.code === "Enter";
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isCtrlEnter = isCtrlOrCmd && isEnterKey && !event.shiftKey;

    if (!isCtrlEnter || !activeCell.value) {
      return false;
    }

    // 如果正在进行 undo/redo 操作，不处理插入行
    if (isUndoRedoInProgress && isUndoRedoInProgress()) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    event.preventDefault();
    event.stopPropagation();

    const rowIndex = activeCell.value.row;
    handleInsertRowOperation(rowOperationOptions, rowIndex);

    return true;
  };

  /**
   * 处理 Ctrl+Delete 删除行
   */
  const handleDeleteRowKey = (event: KeyboardEvent): boolean => {
    const isDeleteKey =
      event.key === KEY_CODES.DELETE ||
      event.code === "Delete" ||
      event.key === KEY_CODES.BACKSPACE ||
      event.code === "Backspace";
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isCtrlDelete =
      isCtrlOrCmd && isDeleteKey && !event.shiftKey && !event.altKey;

    if (!isCtrlDelete || !activeCell.value) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const range = normalizedSelection.value;
    if (range && range.minRow !== range.maxRow) {
      // 多行删除：删除选中的所有行
      const rowIndices: number[] = [];
      for (let row = range.minRow; row <= range.maxRow; row++) {
        rowIndices.push(row);
      }
      handleDeleteRowOperation(rowOperationOptions, rowIndices);
    } else {
      // 单行删除：删除当前活动行
      const rowIndex = activeCell.value.row;
      handleDeleteRowOperation(rowOperationOptions, rowIndex);
    }

    return true;
  };

  /**
   * 处理删除键(删除选区内容）
   */
  const handleDelete = (event: KeyboardEvent): boolean => {
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

    // 收集要删除的单元格变化信息（在删除之前捕获原始值）
    const changes: CellChange[] = [];
    for (let r = range.minRow; r <= range.maxRow; r++) {
      if (!tableData.value[r]) continue;
      for (let c = range.minCol; c <= range.maxCol; c++) {
        const oldValue = tableData.value[r]?.[c] ?? "";
        if (oldValue !== "") {
          // 只记录非空单元格的删除
          changes.push({
            row: r,
            col: c,
            oldValue,
            newValue: "",
          });
        }
      }
    }

    // 执行删除操作
    deleteSelection(range);

    // 如果有变化，保存历史记录（在删除之后保存）
    if (changes.length > 0) {
      saveHistory(tableData.value, {
        type: HistoryActionType.DELETE,
        description: `Delete ${changes.length} cell(s)`,
        changes,
      });
    }

    return true;
  };

  /**
   * 处理自定义菜单项快捷键
   */
  const handleCustomShortcuts = (event: KeyboardEvent): boolean => {
    if (!customMenuItems || customMenuItems.length === 0) {
      return false;
    }

    if (!handleCustomAction || !createMenuContext || !activeCell.value) {
      return false;
    }

    for (const item of customMenuItems) {
      if (!item.shortcut) continue;

      const shortcutConfig = parseShortcut(item.shortcut);
      if (!shortcutConfig) {
        console.warn(
          `useKeyboard: Failed to parse shortcut "${item.shortcut}" for menu item "${item.id}"`
        );
        continue;
      }

      if (matchShortcut(event, shortcutConfig)) {
        const context = createMenuContext(activeCell.value.row);

        if (typeof item.validate === "function") {
          try {
            if (!item.validate(context)) {
              continue;
            }
          } catch (error) {
            console.warn(
              `useKeyboard: validate function error for menu item "${item.id}":`,
              error
            );
            continue;
          }
        }

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
   */
  const handleDirectTyping = (event: KeyboardEvent): boolean => {
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
    // 先保存原始值，然后修改数据，再开始编辑
    // 这样 startEdit 可以正确记录编辑前的值
    const originalValue = tableData.value[row][col] ?? "";
    tableData.value[row][col] = event.key;
    // 传递原始值给 startEdit，确保历史记录能正确记录变化
    startEdit(row, col, false, originalValue);
    return true;
  };

  /**
   * 处理 ESC 键（退出复制状态）
   * 只有在处于复制状态时才处理，否则让事件正常传播（供弹出框使用）
   */
  const handleEscape = (event: KeyboardEvent): boolean => {
    if (event.key === KEY_CODES.ESCAPE) {
      // 只有在处于复制状态时才处理 ESC 键
      if (copiedRange?.value && exitCopyMode) {
        exitCopyMode();
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      // 如果不在复制状态，不处理 ESC 键，让事件正常传播给弹出框
    }
    return false;
  };

  /**
   * 主键盘处理函数
   */
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    // ESC 键处理（优先处理，不需要 activeCell）
    if (handleEscape(event)) return;

    if (!activeCell.value) {
      return;
    }

    if (handleUndoRedo(event)) return;
    if (handleCopyShortcut(event)) return;
    if (handlePasteShortcut(event)) return;
    if (editingCell.value) return;
    if (handleInsertRow(event)) return;
    if (handleDeleteRowKey(event)) return;
    if (handleCustomShortcuts(event)) return;
    if (handleNavigation(event)) return;
    if (handleDelete(event)) return;
    if (handleDirectTyping(event)) return;
  };

  return {
    handleKeydown,
  };
}
