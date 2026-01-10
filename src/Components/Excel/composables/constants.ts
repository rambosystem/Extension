/**
 * Excel 组件常量定义
 * 集中管理所有常量，提升可维护性
 */

// 键盘事件常量
export const KEY_CODES = {
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  TAB: "Tab",
  ENTER: "Enter",
  DELETE: "Delete",
  BACKSPACE: "Backspace",
  ESCAPE: "Escape",
  Z: "z",
  Y: "y",
} as const;

// 键盘修饰键
export const MODIFIER_KEYS = {
  CTRL: "ctrlKey",
  META: "metaKey",
  SHIFT: "shiftKey",
  ALT: "altKey",
} as const;

// 导航方向
export const NAV_DIRECTION = {
  UP: -1,
  DOWN: 1,
  LEFT: -1,
  RIGHT: 1,
  NONE: 0,
} as const;

// 默认配置
export const DEFAULT_CONFIG = {
  ROWS_COUNT: 15,
  COLS_COUNT: 10,
  MAX_HISTORY_SIZE: 50,
  INPUT_FOCUS_DELAY: 0, // setTimeout 延迟
} as const;

// 单元格位置类型
export const CELL_POSITION_TYPE = {
  ROW: "row",
  COL: "col",
} as const;

// 剪贴板分隔符
export const CLIPBOARD_SEPARATORS = {
  ROW: "\n",
  CELL: "\t",
  LINE_BREAK: /\r\n|\n|\r/,
} as const;

// 类型定义
export type KeyCode = typeof KEY_CODES[keyof typeof KEY_CODES];
export type ModifierKey = typeof MODIFIER_KEYS[keyof typeof MODIFIER_KEYS];
export type NavDirection = typeof NAV_DIRECTION[keyof typeof NAV_DIRECTION];
export type CellPositionType = typeof CELL_POSITION_TYPE[keyof typeof CELL_POSITION_TYPE];
