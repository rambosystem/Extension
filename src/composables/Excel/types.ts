import type { Ref, ComputedRef } from "vue";

/**
 * 单元格位置
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * 选区范围
 */
export interface SelectionRange {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

/**
 * 多选结束选项
 */
export interface EndMultipleSelectionDragOptions {
  removeSingleCell?: CellPosition | null;
  removeSelectionIndex?: number;
  isCancelMode?: boolean;
}

/**
 * 列宽配置
 */
export interface ColumnWidthConfig {
  key?: number;
  others?: number;
}

/**
 * 菜单上下文对象（从 useCellMenuPosition 导入，避免循环依赖）
 */
export type { MenuContext } from "./useCellMenuPosition";
