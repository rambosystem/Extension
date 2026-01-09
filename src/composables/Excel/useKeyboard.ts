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
  startEdit: (
    row: number,
    col: number,
    selectAll?: boolean,
    initialValue?: string
  ) => void;
  deleteSelection: (range: SelectionRange) => void;
  handleInsertRowBelow: (rowIndex: number) => void;
  handleDeleteRow: (rowIndexOrIndices: number | number[]) => void;
  tableData: Ref<string[][]>;
  rows: Ref<number[]>;
  columns: Ref<string[]>;
  getMaxRows: () => number;
  getMaxCols: () => number;
  customMenuItems?: CustomMenuItem[];
  handleCustomAction?: (payload: { id: string; context: MenuContext }) => void;
  createMenuContext?: (rowIndex: number) => MenuContext;
  copyToClipboard?: () => Promise<boolean>;
  pasteFromClipboard?: () => Promise<boolean>;
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
 * 生成列标签（A, B, C, ..., Z, AA, AB, ...）
 */
const generateColumnLabel = (index: number): string => {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = Math.floor((index - 26) / 26);
  const second = (index - 26) % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
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
  handleInsertRowBelow,
  handleDeleteRow,
  tableData,
  rows,
  columns,
  getMaxRows,
  getMaxCols,
  customMenuItems = [],
  handleCustomAction,
  createMenuContext,
  copyToClipboard,
  pasteFromClipboard,
}: UseKeyboardOptions): UseKeyboardReturn {
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

      if (result && result.state && Array.isArray(result.state)) {
        // 验证状态的有效性
        const validatedState = result.state.map((row) => {
          if (row === null || row === undefined) {
            return [];
          }
          if (Array.isArray(row)) {
            return row.map((cell) => String(cell ?? ""));
          }
          return [];
        });
        // 确保至少有一行
        if (validatedState.length === 0) {
          validatedState.push([]);
        }

        tableData.value = validatedState;

        // 始终使用 tableData 的实际大小来调整行列
        const targetRowCount = validatedState.length;
        const targetColCount = Math.max(
          ...validatedState.map((row) => row.length),
          1
        );

        // 调整行数量
        if (rows.value.length !== targetRowCount) {
          if (rows.value.length > targetRowCount) {
            rows.value = rows.value.slice(0, targetRowCount);
          } else {
            while (rows.value.length < targetRowCount) {
              rows.value.push(rows.value.length);
            }
          }
        }

        // 调整列数量
        if (columns.value.length !== targetColCount) {
          if (columns.value.length > targetColCount) {
            columns.value = columns.value.slice(0, targetColCount);
          } else {
            while (columns.value.length < targetColCount) {
              columns.value.push(generateColumnLabel(columns.value.length));
            }
          }
        }

        // 验证并调整 activeCell 位置，确保它在有效范围内
        if (activeCell.value) {
          const maxRows = validatedState.length;
          const maxCols = validatedState[0]?.length || 0;

          if (
            activeCell.value.row >= maxRows ||
            activeCell.value.col >= maxCols
          ) {
            // 如果当前活动单元格超出范围，移动到最后一个有效单元格
            activeCell.value = {
              row: Math.max(0, Math.min(activeCell.value.row, maxRows - 1)),
              col: Math.max(0, Math.min(activeCell.value.col, maxCols - 1)),
            };
          }
        }
      }
      event.preventDefault();
      return true;
    }

    if (key === KEY_CODES.Y) {
      const result = redoHistory();

      if (result && result.state && Array.isArray(result.state)) {
        // 验证状态的有效性
        const validatedState = result.state.map((row) => {
          if (row === null || row === undefined) {
            return [];
          }
          if (Array.isArray(row)) {
            return row.map((cell) => String(cell ?? ""));
          }
          return [];
        });
        // 确保至少有一行
        if (validatedState.length === 0) {
          validatedState.push([]);
        }
        tableData.value = validatedState;

        // 始终使用 tableData 的实际大小来调整行列
        const targetRowCount = validatedState.length;
        const targetColCount = Math.max(
          ...validatedState.map((row) => row.length),
          1
        );

        // 调整行数量
        if (rows.value.length !== targetRowCount) {
          if (rows.value.length > targetRowCount) {
            rows.value = rows.value.slice(0, targetRowCount);
          } else {
            while (rows.value.length < targetRowCount) {
              rows.value.push(rows.value.length);
            }
          }
        }

        // 调整列数量
        if (columns.value.length !== targetColCount) {
          if (columns.value.length > targetColCount) {
            columns.value = columns.value.slice(0, targetColCount);
          } else {
            while (columns.value.length < targetColCount) {
              columns.value.push(generateColumnLabel(columns.value.length));
            }
          }
        }

        // 验证并调整 activeCell 位置，确保它在有效范围内
        if (activeCell.value) {
          const maxRows = validatedState.length;
          const maxCols = validatedState[0]?.length || 0;

          if (
            activeCell.value.row >= maxRows ||
            activeCell.value.col >= maxCols
          ) {
            // 如果当前活动单元格超出范围，移动到最后一个有效单元格
            activeCell.value = {
              row: Math.max(0, Math.min(activeCell.value.row, maxRows - 1)),
              col: Math.max(0, Math.min(activeCell.value.col, maxCols - 1)),
            };
          }
        }
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

    if (!isCtrlEnter || !handleInsertRowBelow || !activeCell.value) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    const rowIndex = activeCell.value.row;
    handleInsertRowBelow(rowIndex);

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

    if (!isCtrlDelete || !handleDeleteRow || !activeCell.value) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const range = normalizedSelection.value;
    if (range && range.minRow !== range.maxRow) {
      const rowIndices: number[] = [];
      for (let row = range.minRow; row <= range.maxRow; row++) {
        rowIndices.push(row);
      }
      handleDeleteRow(rowIndices);
    } else {
      const rowIndex = activeCell.value.row;
      handleDeleteRow(rowIndex);
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
   * 主键盘处理函数
   */
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

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
