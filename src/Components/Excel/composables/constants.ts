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
  // 历史记录配置
  MERGE_TIME_WINDOW: 500, // 操作合并时间窗口（毫秒）
  CHECKPOINT_INTERVAL: 10, // 检查点间隔（增量操作数）
  // 性能优化配置
  DEBOUNCE_DELAY: 300, // 防抖延迟（毫秒）
  THROTTLE_DELAY: 16, // 节流延迟（毫秒，约60fps）
  // 样式计算配置
  CELL_PADDING_H: 13, // 单元格水平内边距
  CELL_PADDING_V: 1, // 单元格垂直内边距
  FONT_SIZE: 13, // 字体大小
  LINE_HEIGHT_RATIO: 1.4, // 行高比例
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
export type KeyCode = (typeof KEY_CODES)[keyof typeof KEY_CODES];
export type ModifierKey = (typeof MODIFIER_KEYS)[keyof typeof MODIFIER_KEYS];
export type NavDirection = (typeof NAV_DIRECTION)[keyof typeof NAV_DIRECTION];
export type CellPositionType =
  (typeof CELL_POSITION_TYPE)[keyof typeof CELL_POSITION_TYPE];
