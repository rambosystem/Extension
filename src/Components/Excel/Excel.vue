<template>
  <div
    class="excel-container"
    @keydown="handleKeydown"
    @copy="handleCopy"
    @paste="handlePaste"
    @click="handleContainerClick"
    @wheel="handleRowWheel"
    tabindex="0"
    ref="containerRef"
  >
    <div class="excel-table" @mouseleave="handleMouseUp">
      <HeaderRow
        :display-columns="displayColumns"
        :get-column-width="getColumnWidth"
        :is-in-selection-header="isInSelectionHeader"
        :enable-column-resize="enableColumnResize"
        :sticky-header="enableHeaderSticky"
        @corner-click="() => handleCornerCellClick()"
        @column-header-mousedown="handleColumnHeaderMouseDown"
        @column-header-mouseenter="handleColumnHeaderMouseEnter"
        @column-resize-start="startColumnResize"
        @column-resize-dblclick="handleDoubleClickResize"
      />

      <!-- 虚拟滚动：上方占位符 -->
      <div
        v-if="virtualScroll.enabled.value && virtualScroll.offsetTop.value > 0"
        class="virtual-scroll-spacer"
        :style="{ height: virtualScroll.offsetTop.value + 'px' }"
      ></div>

      <!-- 数据行（虚拟滚动时只渲染可见行） -->
      <DataRow
        v-for="(_rowValue, visibleIndex) in visibleRows"
        :key="getActualRowIndex(visibleIndex)"
        :row-index="getActualRowIndex(visibleIndex)"
        :columns="internalColumns"
        :table-data="tableData"
        :get-column-width="getColumnWidth"
        :get-row-height="getRowHeight"
        :get-cell-display-style="getCellDisplayStyle"
        :is-in-selection-header="isInSelectionHeader"
        :is-active="isActive"
        :is-in-selection="isInSelection"
        :is-in-drag-area="isInDragArea"
        :is-editing="isEditing"
        :is-selection-bottom-right="isSelectionBottomRight"
        :should-show-cell-menu="shouldShowCellMenu"
        :get-selection-border-class="getSelectionBorderClass"
        :get-copied-range-border-class="getCopiedRangeBorderClass"
        :get-multiple-drag-border-class="getMultipleDragBorderClass"
        :get-drag-target-border-class="getDragTargetBorderClass"
        :create-menu-context="createMenuContext"
        :is-multi-select="isMultiSelect"
        :editing-cell="editingCell"
        :enable-row-resize="enableRowResize"
        :enable-fill-handle="enableFillHandle"
        :custom-menu-items="customMenuItems"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :can-paste="canPaste"
        @row-number-mousedown="handleRowNumberMouseDown"
        @row-number-mouseenter="handleRowNumberMouseEnter"
        @row-resize-start="startRowResize"
        @row-resize-dblclick="handleDoubleClickRowResize"
        @cell-mousedown="
          (rowIndex, colIndex, event) =>
            handleCellMouseDown(
              rowIndex,
              colIndex,
              rows.length,
              internalColumns.length,
              event,
            )
        "
        @cell-dblclick="startEdit"
        @cell-mouseenter="handleMouseEnter"
        @cell-input-blur="stopEdit"
        @cell-input-enter="(event) => event && handleInputEnter(event)"
        @cell-input-tab="(event) => event && handleInputTab(event)"
        @cell-input-esc="cancelEdit"
        @cell-input-change="
          (value, row, col) => {
            tableData[row][col] = value;
          }
        "
        @cell-input-ref="setInputRef"
        @fill-drag-start="startFillDrag"
        @cell-menu-command="(command) => handleCellMenuCommand(command)"
        @cell-menu-custom-action="handleCustomAction"
        @cell-menu-visible-change="handleMenuVisibleChange"
      />

      <!-- 虚拟滚动：下方占位符 -->
      <div
        v-if="
          virtualScroll.enabled.value && virtualScroll.offsetBottom.value > 0
        "
        class="virtual-scroll-spacer"
        :style="{ height: virtualScroll.offsetBottom.value + 'px' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  shallowRef,
  onMounted,
  onUnmounted,
  computed,
  nextTick,
  watch,
} from "vue";
import { CellElementCache } from "./composables/utils";
import { useVirtualScroll } from "./composables/useVirtualScroll";
import { useHistory } from "./composables/history/useHistory";
import { useSelection } from "./composables/selection/useSelection";
import { createSelectionService } from "./composables/selection/selectionService";
import type { SelectionService } from "./composables/selection/selectionService";
import { createUndoRedoService } from "./composables/history/undoRedoService";
import { useExcelData } from "./composables/useExcelData";
import { useExcelState } from "./composables/useExcelState";
import { useKeyboard } from "./composables/useKeyboard";
import { useColumnWidth } from "./composables/rowColumnOps/useColumnWidth";
import { useRowHeight } from "./composables/rowColumnOps/useRowHeight";
import { useFillHandle } from "./composables/useFillHandle";
import { useCellEditing } from "./composables/useCellEditing";
import { useFavorites } from "./composables/clipboard/useClipboard";
import { useCellDisplay } from "./composables/useCellDisplay";
import { useSizeManager } from "./composables/useSizeManager";
import { useSelectionStyle } from "./composables/selection/useSelectionStyle";
import { useMouseEvents } from "./composables/useMouseEvents";
import { useDataSync } from "./composables/dataSync/useDataSync";
import { useCellMenu } from "./composables/useCellMenu";
import { useCellMenuPosition } from "./composables/useCellMenuPosition";
import { useResizeHandlers } from "./composables/rowColumnOps/useResizeHandlers";
import { createExcelEventBus } from "./composables/eventBus/useExcelEventBus";
import type {
  ColumnWidthConfig,
  MenuContext,
  SelectionRange,
} from "./composables/types";
import type { CustomMenuItem } from "./composables/useKeyboard";
import HeaderRow from "./components/HeaderRow.vue";
import DataRow from "./components/DataRow.vue";

/**
 * Excel 组件 Props
 *
 * 注意：以下三个属性为 **init-only**，即仅在组件首次挂载时生效。
 * 运行期修改不会重建内部 composable，也不会切换能力。
 * 如需在运行期切换，请在父组件对 Excel 组件使用 `:key` 触发重建。
 *
 * - enableColumnResize
 * - enableRowResize
 * - enableFillHandle
 */
interface Props {
  /** init-only：是否启用列宽拖拽。修改需通过 :key 重建组件。 */
  enableColumnResize?: boolean;
  /** init-only：是否启用智能填充手柄。修改需通过 :key 重建组件。 */
  enableFillHandle?: boolean;
  defaultColumnWidth?: number | ColumnWidthConfig;
  /** init-only：是否启用行高拖拽。修改需通过 :key 重建组件。 */
  enableRowResize?: boolean;
  defaultRowHeight?: number;
  enableRowScrollStep?: boolean;
  enableHeaderSticky?: boolean;
  modelValue?: string[][] | null;
  columnNames?: string[] | null;
  customMenuItems?: CustomMenuItem[];
  readOnlyColumns?: string[] | null;
}

const props = withDefaults(defineProps<Props>(), {
  enableColumnResize: true,
  enableFillHandle: true,
  defaultColumnWidth: 100,
  enableRowResize: true,
  defaultRowHeight: 36,
  enableRowScrollStep: true,
  enableHeaderSticky: true,
  modelValue: null,
  columnNames: null,
  customMenuItems: () => [],
});

/**
 * Excel 组件 Emits
 */
const emit = defineEmits<{
  "update:modelValue": [data: string[][]];
  change: [data: string[][]];
  "custom-action": [payload: { id: string; context: MenuContext }];
}>();

// --- 1. 统一状态管理 ---
// 创建统一状态管理，整合核心状态
const excelState = useExcelState({
  initialData: props.modelValue,
});

// --- init-only props 运行期变更告警（仅 DEV）---
// enableColumnResize / enableRowResize / enableFillHandle 仅在挂载时读取一次，
// 运行期切换不会重建内部 composable。这里在 DEV 模式下提示开发者用 :key 触发重建。
if (import.meta.env.DEV) {
  const initialInitOnly = {
    enableColumnResize: props.enableColumnResize,
    enableRowResize: props.enableRowResize,
    enableFillHandle: props.enableFillHandle,
  };
  watch(
    () => [
      props.enableColumnResize,
      props.enableRowResize,
      props.enableFillHandle,
    ],
    ([c, r, f]) => {
      if (
        c !== initialInitOnly.enableColumnResize ||
        r !== initialInitOnly.enableRowResize ||
        f !== initialInitOnly.enableFillHandle
      ) {
        console.warn(
          "[Excel] enableColumnResize / enableRowResize / enableFillHandle 为 init-only prop，运行期切换不会生效。如需切换，请在父组件使用 :key 强制重建 Excel 组件。",
        );
      }
    },
  );
}

// 从统一状态获取数据引用
const { tableData, columns: internalColumns, rows } = excelState.data;

// 滚动步进控制：确保每次滚动对齐整行高度
const wheelAccumulator = ref(0);

// 使用统一状态的数据操作方法
const {
  getSmartValue,
  setData,
  getData,
  updateCell,
  clearData,
  deleteRow,
  insertRowBelow,
} = useExcelData({
  dataState: excelState.data,
});

// 使用自定义列标题或默认列标题（仅用于显示）
const displayColumns = computed<string[]>(() => {
  if (
    props.columnNames &&
    Array.isArray(props.columnNames) &&
    props.columnNames.length > 0
  ) {
    // 如果提供了自定义列标题，使用自定义的，但确保数量匹配
    return props.columnNames
      .slice(0, internalColumns.value.length)
      .map((name, index) => {
        // 如果自定义列标题数量不足，用默认的补齐
        return name || internalColumns.value[index] || "";
      });
  }
  return internalColumns.value;
});

// 使用统一状态的选择管理
const selection = useSelection({ state: excelState.selection });
const {
  activeCell,
  selectionStart,
  selectionEnd,
  isSelecting,
  normalizedSelection,
  multiSelections,
  isMultipleMode,
  startSingleSelection,
  updateSingleSelectionEnd,
  startMultipleSelection,
  updateMultipleSelectionEnd,
  endMultipleSelectionClick,
  endMultipleSelectionDrag,
  isActive,
  isInSelection,
  isInSelectionHeader,
  moveActiveCell,
  clearSelection, // 清除选择函数
  selectRow,
  selectColumn,
  selectRows,
  selectColumns,
  selectAll,
} = selection;

const selectionService = createSelectionService({
  rows,
  columns: internalColumns,
  selection,
});

const eventBus = createExcelEventBus();

/**
 * 选区服务（带事件总线通知）
 *
 * 通过统一的 range 构造器来消除以往每个方法手写一遍 emit 的样板代码。
 * 任何新增的选区方法只需要在下方表中追加一行即可。
 *
 * 相比 Object.fromEntries 方案，这里通过泛型辅助函数逐方法包装，
 * 可以完整保留 SelectionService[K] 的参数与返回值签名，
 * SelectionService 接口变更时编译期即可发现调用点不匹配。
 */
const maxRowIdx = () => Math.max(0, rows.value.length - 1);
const maxColIdx = () => Math.max(0, internalColumns.value.length - 1);

type SelectionAction = keyof SelectionService;
type RangeBuilder<K extends SelectionAction> = (
  ...args: Parameters<SelectionService[K]>
) => SelectionRange | null | undefined;

const rangeBuilders: { [K in SelectionAction]: RangeBuilder<K> } = {
  applyRange: (range) => range ?? null,
  startSingleSelection: (row, col) => ({
    minRow: row,
    maxRow: row,
    minCol: col,
    maxCol: col,
  }),
  updateSingleSelectionEnd: (row, col) => ({
    minRow: row,
    maxRow: row,
    minCol: col,
    maxCol: col,
  }),
  clear: () => undefined,
  selectRow: (rowIndex) => ({
    minRow: rowIndex,
    maxRow: rowIndex,
    minCol: 0,
    maxCol: maxColIdx(),
  }),
  selectColumn: (colIndex) => ({
    minRow: 0,
    maxRow: maxRowIdx(),
    minCol: colIndex,
    maxCol: colIndex,
  }),
  selectRows: (startRow, endRow) => ({
    minRow: startRow,
    maxRow: endRow,
    minCol: 0,
    maxCol: maxColIdx(),
  }),
  selectColumns: (startCol, endCol) => ({
    minRow: 0,
    maxRow: maxRowIdx(),
    minCol: startCol,
    maxCol: endCol,
  }),
  selectAll: (rowCount, colCount) => ({
    minRow: 0,
    maxRow: Math.max(0, rowCount - 1),
    minCol: 0,
    maxCol: Math.max(0, colCount - 1),
  }),
};

// 说明：Vue SFC (.vue) + jsx=preserve 下泛型箭头函数与 JSX 解析冲突，
// 这里用索引类型 + 内部断言代替泛型函数。
// 对外保持 selectionServiceWithEvents: SelectionService 严格签名，
// SelectionService 新增方法时，下方对象字面量会编译期报错（缺字段）。
type AnySelectionFn = (...args: unknown[]) => unknown;

const wrapSelectionAction = (action: SelectionAction): AnySelectionFn => {
  const original = selectionService[action] as AnySelectionFn;
  const builder = rangeBuilders[action] as (
    ...a: unknown[]
  ) => SelectionRange | null | undefined;
  return (...args: unknown[]) => {
    const result = original(...args);
    const range = builder(...args);
    eventBus.emit("selection", {
      action,
      ...(range !== undefined ? { range } : {}),
    });
    return result;
  };
};

const selectionServiceWithEvents: SelectionService = {
  applyRange: wrapSelectionAction(
    "applyRange",
  ) as SelectionService["applyRange"],
  startSingleSelection: wrapSelectionAction(
    "startSingleSelection",
  ) as SelectionService["startSingleSelection"],
  updateSingleSelectionEnd: wrapSelectionAction(
    "updateSingleSelectionEnd",
  ) as SelectionService["updateSingleSelectionEnd"],
  clear: wrapSelectionAction("clear") as SelectionService["clear"],
  selectRow: wrapSelectionAction("selectRow") as SelectionService["selectRow"],
  selectColumn: wrapSelectionAction(
    "selectColumn",
  ) as SelectionService["selectColumn"],
  selectRows: wrapSelectionAction(
    "selectRows",
  ) as SelectionService["selectRows"],
  selectColumns: wrapSelectionAction(
    "selectColumns",
  ) as SelectionService["selectColumns"],
  selectAll: wrapSelectionAction("selectAll") as SelectionService["selectAll"],
};

/**
 * 判断当前是否处于多单元格选区状态
 *
 * 命中以下任一条件即视为多选：
 * 1. 处于 MULTIPLE 模式（Ctrl+点击触发）
 * 2. multiSelections 中存在超过 1 个选区
 * 3. multiSelections 中唯一的选区是非单格选区
 * 4. 当前 selectionStart / selectionEnd 跨越了多个单元格
 */
const isRange = (s: SelectionRange): boolean =>
  s.minRow !== s.maxRow || s.minCol !== s.maxCol;

const isMultiSelect = computed<boolean>(() => {
  if (isMultipleMode.value) return true;

  const sels = multiSelections.value;
  if (sels && sels.length > 0) {
    if (sels.length > 1) return true;
    if (sels[0] && isRange(sels[0])) return true;
  }

  const s = selectionStart.value;
  const e = selectionEnd.value;
  return !!(s && e && (s.row !== e.row || s.col !== e.col));
});

const normalizeColumnName = (value: string | undefined | null): string =>
  String(value ?? "")
    .trim()
    .toUpperCase();

/**
 * 只读列集合
 *
 * 注意：此组件是通用 Excel 组件，不包含任何业务默认值。
 * 如需将某些列设为只读，请由调用方显式传入 readOnlyColumns。
 */
const readOnlyColumnSet = computed<Set<string>>(
  () => new Set((props.readOnlyColumns ?? []).map(normalizeColumnName)),
);

/**
 * 预归一化后的显示列名，避免 isCellEditable 在逐单元格调用时重复计算
 */
const normalizedDisplayColumns = computed<string[]>(() =>
  displayColumns.value.map(normalizeColumnName),
);

const isCellEditable = (_row: number, col: number): boolean => {
  const cols = normalizedDisplayColumns.value;
  // 越界列不可编辑
  if (col < 0 || col >= cols.length) return false;
  const colName = cols[col];
  if (!colName) return true;
  return !readOnlyColumnSet.value.has(colName);
};

// --- 历史状态与选区应用 ---
const canUndo = ref(false);
const canRedo = ref(false);
const canPaste = ref(false);

const updateHistoryState = () => {
  canUndo.value = canUndoFn();
  canRedo.value = canRedoFn();
};

const saveHistoryWithState = (
  state: any,
  options: Parameters<typeof saveHistory>[1],
) => {
  saveHistory(state, options);
  eventBus.emit("history", {
    action: "save",
    info: {
      type: options?.type,
      description: options?.description,
    },
  });
  updateHistoryState();
};

const undoHistoryWithState = () => {
  const result = undoHistory();
  eventBus.emit("history", { action: "undo" });
  updateHistoryState();
  return result;
};

const redoHistoryWithState = () => {
  const result = redoHistory();
  eventBus.emit("history", { action: "redo" });
  updateHistoryState();
  return result;
};

const {
  initHistory,
  saveHistory,
  undo: undoHistory,
  redo: redoHistory,
  canUndo: canUndoFn,
  canRedo: canRedoFn,
  isUndoRedoInProgress,
} = useHistory();

const initHistoryWithEvents = (data: string[][]): void => {
  initHistory(data);
  eventBus.emit("history", { action: "init", info: { rows: data.length } });
};

// 智能填充管理（仅在启用时使用）
const fillHandleComposable = props.enableFillHandle
  ? useFillHandle({
      getSmartValue,
      saveHistory,
      isCellEditable,
    })
  : null;

// 列宽管理（仅在启用时使用）
// 传入初始列数，Map 会自动处理新增列（使用默认宽度）
// 注意：如果 defaultColumnWidth 是对象，useColumnWidth 的 defaultWidth 使用 others 值
const getDefaultWidthForComposable = (): number => {
  if (
    typeof props.defaultColumnWidth === "object" &&
    props.defaultColumnWidth !== null
  ) {
    return props.defaultColumnWidth.others || 100;
  }
  return (props.defaultColumnWidth as number) || 100;
};

const columnWidthComposable = props.enableColumnResize
  ? useColumnWidth({
      defaultWidth: getDefaultWidthForComposable(),
    })
  : null;

// 行高管理（仅在启用时使用）
// 传入初始行数，Map会自动处理新增行（使用默认高度）
const rowHeightComposable = props.enableRowResize
  ? useRowHeight({
      rowsCount: rows.value.length,
    })
  : null;

// --- 状态管理 ---
const containerRef = ref<HTMLElement | null>(null);

// --- 单元格编辑管理（使用统一状态）---
const {
  editingCell,
  isEditing,
  startEdit,
  stopEdit,
  cancelEdit,
  setInputRef,
  handleInputEnter,
  handleInputTab,
  clearInputRefs,
} = useCellEditing({
  dataState: excelState.data,
  editingState: excelState.editing,
  startSingleSelection,
  saveHistory,
  moveActiveCell,
  isCellEditable,
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
  containerRef,
});

// --- 尺寸管理 ---
const { getColumnWidth, getDefaultColumnWidth, getRowHeight } = useSizeManager({
  props,
  columnWidthComposable,
  rowHeightComposable,
});

/**
 * 行顶部偏移前缀和缓存
 *
 * 当存在自定义行高时，朴素实现每次计算 getRowTop/getRowIndexByScrollTop 都要
 * 从第 0 行累加到目标行，O(n)。滚动事件频繁时会导致明显卡顿。
 *
 * 这里维护一个懒计算的前缀和数组 rowTopPrefixSum：
 *   rowTopPrefixSum[i] = 前 i 行（不含第 i 行）的高度之和。
 *
 * - 首次访问时计算，O(n) 一次。
 * - 命中后 getRowTop 为 O(1)，getRowIndexByScrollTop 改用二分为 O(log n)。
 * - 当行数 / 自定义行高集合变化时 invalidate，下一次访问重新构建。
 */
let rowTopPrefixSum: number[] | null = null;

const invalidateRowPrefix = (): void => {
  rowTopPrefixSum = null;
};

const ensureRowPrefixSum = (): number[] => {
  if (rowTopPrefixSum) {
    return rowTopPrefixSum;
  }
  const total = rows.value.length;
  const arr = new Array<number>(total + 1);
  arr[0] = 0;
  for (let i = 0; i < total; i++) {
    arr[i + 1] = arr[i] + getRowHeight(i);
  }
  rowTopPrefixSum = arr;
  return arr;
};

/**
 * 行顶部偏移量计算
 *
 * - 无自定义行高：乘法 O(1)。
 * - 存在自定义行高：查前缀和表 O(1)。
 */
const getRowTop = (rowIndex: number): number => {
  const hasCustomHeights =
    !!rowHeightComposable && rowHeightComposable.rowHeights.value.size > 0;
  if (!hasCustomHeights) {
    const defaultH = props.defaultRowHeight || 36;
    return rowIndex * defaultH;
  }
  const arr = ensureRowPrefixSum();
  const clamped = Math.max(0, Math.min(rowIndex, arr.length - 1));
  return arr[clamped] ?? 0;
};

const getRowIndexByScrollTop = (scrollTop: number): number => {
  const total = rows.value.length;
  if (total === 0) return 0;

  const hasCustomHeights =
    !!rowHeightComposable && rowHeightComposable.rowHeights.value.size > 0;
  if (!hasCustomHeights) {
    const defaultH = props.defaultRowHeight || 36;
    return Math.max(0, Math.min(total - 1, Math.floor(scrollTop / defaultH)));
  }

  // 二分查找第一个 prefix[i+1] > scrollTop 的 i
  const arr = ensureRowPrefixSum();
  let lo = 0;
  let hi = total - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid + 1] > scrollTop) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return Math.max(0, Math.min(total - 1, lo));
};

const scrollToRowIndex = (rowIndex: number): void => {
  if (!containerRef.value) return;
  const clampedIndex = Math.max(0, Math.min(rows.value.length - 1, rowIndex));
  containerRef.value.scrollTop = getRowTop(clampedIndex);
};

const handleRowWheel = (event: WheelEvent): void => {
  if (!props.enableRowScrollStep) return;
  if (!rows.value.length || !containerRef.value) return;
  event.preventDefault();

  wheelAccumulator.value += event.deltaY;

  const currentTop = containerRef.value.scrollTop;
  const currentIndex = getRowIndexByScrollTop(currentTop);
  const currentRowHeight = getRowHeight(currentIndex);
  if (Math.abs(wheelAccumulator.value) < currentRowHeight) return;

  const direction = wheelAccumulator.value > 0 ? 1 : -1;
  const steps = Math.max(
    1,
    Math.floor(Math.abs(wheelAccumulator.value) / currentRowHeight),
  );
  wheelAccumulator.value = 0;

  const currentRowTop = getRowTop(currentIndex);
  const currentRowBottom = currentRowTop + currentRowHeight;
  let targetIndex = currentIndex + direction * steps;

  if (steps === 1) {
    if (direction < 0 && currentTop > currentRowTop + 1) {
      targetIndex = currentIndex;
    } else if (direction > 0 && currentTop < currentRowBottom - 1) {
      targetIndex = currentIndex + 1;
    }
  }

  scrollToRowIndex(targetIndex);
};

// --- 单元格显示样式管理 ---
const { getCellDisplayStyle, clearStyleCache: clearCellDisplayCache } = useCellDisplay({
  tableData,
  getColumnWidth,
  getRowHeight,
});

// --- 虚拟滚动管理（大数据量性能优化）---
const virtualScroll = useVirtualScroll(
  computed(() => rows.value.length),
  {
    threshold: 100, // 超过 100 行启用虚拟滚动
    bufferSize: 5, // 缓冲区 5 行
    defaultRowHeight: props.defaultRowHeight || 36,
  },
);

// 计算可见行范围
const visibleRows = computed(() => {
  if (!virtualScroll.enabled.value) {
    // 未启用虚拟滚动，返回所有行
    return rows.value;
  }
  // 只返回可见行
  const start = virtualScroll.startIndex.value;
  const end = virtualScroll.endIndex.value;
  return rows.value.slice(start, end + 1);
});

/**
 * 获取实际行索引（考虑虚拟滚动）
 */
const getActualRowIndex = (visibleIndex: number): number => {
  if (!virtualScroll.enabled.value) {
    return visibleIndex;
  }
  return virtualScroll.startIndex.value + visibleIndex;
};

// 智能填充相关函数
const applyFill = (): void => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.applyFill(
    tableData.value,
    rows.value.length,
    internalColumns.value.length,
  );
};

const handleFillDragEnter = (row: number, col: number): void => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.handleFillDragEnter(row, col);
};

const isInDragArea = (row: number, col: number): boolean => {
  if (!props.enableFillHandle || !fillHandleComposable) return false;
  return fillHandleComposable.isInDragArea(row, col);
};

// --- 数据同步管理（需要在 useFavorites 之前，因为需要 emitSync）---
// 注意：useDataSync 只会 emit "update:modelValue" 和 "change" 两种事件，
// "custom-action" 由 handleCustomAction 直接 emit，不经过此处。
// 这里只做 runtime 兜底校验：data 必须是二维数组。
const { emitSync, initDataSync, setDataWithSync, runExternalUpdate } =
  useDataSync({
    tableData,
    props,
    getData,
    setData,
    emit: (event, ...args) => {
      const data = args[0];
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        if (import.meta.env.DEV) {
          console.warn(`[Excel] Invalid data type for ${event}`, data);
        }
        return;
      }
      if (event === "update:modelValue") {
        emit("update:modelValue", data as string[][]);
      } else if (event === "change") {
        emit("change", data as string[][]);
      }
    },
    onEmitSync: (data) => {
      eventBus.emit("modelUpdate", { data });
      eventBus.emit("change", { data });
    },
    initHistory: initHistoryWithEvents, // 传入 initHistory 函数，用于在数据更新时重新初始化历史记录
    isUndoRedoInProgress, // 传入 isUndoRedoInProgress 函数，防止撤销/重做时清空历史
  });

// --- 撤销/重做选区刷新回调 ---
// 扩展点：如未来需要在撤销/重做后给选区加视觉 flash 反馈，
// 实现一个函数并通过 undoRedoService 的 triggerSelectionFlash 参数注入即可。
// 当前没有视觉反馈，无需传入。

// 初始化数据同步监听
initDataSync();

// --- 剪贴板管理（使用统一状态）---
const {
  handleCopy,
  handlePaste,
  copyToFavorites,
  cutToFavorites,
  pasteFromFavorites,
  hasFavoritesContent,
  copiedRange,
  exitCopyMode,
} = useFavorites({
  state: excelState,
  saveHistory: saveHistoryWithState,
  selectionService: selectionServiceWithEvents,
  isCellEditable,
  emitSync,
});

// --- 选区样式管理 ---
const {
  getSelectionBorderClass,
  getCopiedRangeBorderClass,
  isSelectionBottomRight,
  getDragTargetBorderClass,
  getMultipleDragBorderClass,
} = useSelectionStyle({
  normalizedSelection,
  multiSelections,
  isMultipleMode,
  isSelecting,
  isInSelection,
  isInDragArea,
  fillHandleComposable,
  copiedRange,
  props,
});

// 保存最后一次鼠标位置，用于菜单位置计算
// 定义必须早于 useMouseEvents 调用，因为 onBeforeMouseUp 回调会写入此 ref
const lastMousePosition = ref<{ x: number; y: number } | null>(null);

// --- 尺寸调整处理器 ---
// useMouseEvents 在下方才会创建，此处尚无 handleMouseUp 引用。
// 使用 shallowRef 中转：先建立空引用，稍后 useMouseEvents 返回后再赋值，
// useResizeHandlers 在实际触发 resize 时才读取 ref.value，从而拿到最新引用。
const handleMouseUpRef = shallowRef<((event: MouseEvent) => void) | null>(null);

const {
  startColumnResize,
  startRowResize,
  stopColumnResize,
  stopRowResize,
  handleDoubleClickResize,
  handleDoubleClickRowResize,
  handleColumnResizeMove,
  handleRowResizeMove,
} = useResizeHandlers({
  props,
  columnWidthComposable,
  rowHeightComposable,
  tableData,
  columns: internalColumns,
  getColumnWidth,
  getDefaultColumnWidth,
  handleMouseUpRef,
});

// --- 鼠标事件管理 ---
// 通过 onBeforeMouseUp 钩子在内部状态重置之前记录鼠标位置，
// 避免在 Excel.vue 再做一层 wrap + 手动 add/removeEventListener 的三明治逻辑。
const { handleMouseUp, handleCellMouseDown, handleMouseEnter } = useMouseEvents(
  {
    isSelecting,
    selectionStart,
    selectionEnd,
    startSingleSelection,
    updateSingleSelectionEnd,
    startMultipleSelection,
    updateMultipleSelectionEnd,
    endMultipleSelectionClick,
    endMultipleSelectionDrag,
    multiSelections,
    isEditing,
    stopEdit,
    handleFillDragEnter,
    applyFill,
    stopColumnResize,
    stopRowResize,
    props,
    fillHandleComposable,
    columnWidthComposable,
    rowHeightComposable,
    handleColumnResize: handleColumnResizeMove,
    handleRowResize: handleRowResizeMove,
    onBeforeMouseUp: (event) => {
      lastMousePosition.value = { x: event.clientX, y: event.clientY };
    },
  },
);

// 将 handleMouseUp 注册给 resize handler 使用
handleMouseUpRef.value = handleMouseUp;

// 填充拖拽开始
function startFillDrag(row: number, col: number): void {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.startFillDrag(row, col, normalizedSelection.value, () =>
    handleMouseUp(new MouseEvent("mouseup")),
  );
}

// --- 8. 键盘主逻辑 ---
/**
 * 删除选区内容
 */
const deleteSelection = (range: SelectionRange): void => {
  for (let r = range.minRow; r <= range.maxRow; r++) {
    if (!tableData.value[r]) continue;
    for (let c = range.minCol; c <= range.maxCol; c++) {
      if (!isCellEditable(r, c)) continue;
      if (tableData.value[r][c] !== undefined) {
        tableData.value[r][c] = "";
      }
    }
  }
};

// --- Cell Menu 管理 ---
// 检查剪贴板是否有内容。
// 剪贴板读取失败（权限被拒绝、浏览器环境不支持等）时，
// 仍然放行"粘贴"菜单，真正粘贴时才让底层逻辑处理异常，避免
// 把菜单禁用住反而让用户无处可点。DEV 模式下打印告警。
//
// canPaste 采用"预刷新"策略，避免菜单弹出时才 await 造成首次展示状态滞后：
//   - 组件挂载后立即刷一次；
//   - window focus 事件（用户从其它应用切回）刷新；
//   - 内部复制/剪切路径后也会经由 emitSync / 菜单 visible 再刷；
//   - 菜单 visible 变化时做一次 fire-and-forget 兜底。
const checkFavorites = async (): Promise<void> => {
  try {
    canPaste.value = await hasFavoritesContent();
  } catch (error) {
    canPaste.value = true;
    if (import.meta.env.DEV) {
      console.warn(
        "[Excel] hasFavoritesContent failed, fallback to true",
        error,
      );
    }
  }
};

const handleWindowFocus = (): void => {
  void checkFavorites();
};

// 菜单打开时更新状态（canPaste 主要依赖预刷新，这里仅做兜底刷新）
const updateMenuStates = (): void => {
  updateHistoryState();
  void checkFavorites();
};

const undoRedoService = createUndoRedoService({
  tableData,
  rows,
  columns: internalColumns,
  activeCell,
  selectionService: selectionServiceWithEvents,
  emitSync,
});

const { handleCellMenuCommand } = useCellMenu({
  copyToFavorites,
  pasteFromFavorites,
  undoHistory: undoHistoryWithState,
  redoHistory: redoHistoryWithState,
  tableData,
  rows,
  columns: internalColumns,
  activeCell,
  normalizedSelection,
  saveHistory: saveHistoryWithState,
  insertRowBelow,
  deleteRow,
  selectionService: selectionServiceWithEvents,
  undoRedoService,
  emitSync,
});

// 行号和列标题选择状态（需要在 useCellMenuPosition 之前定义）
interface HeaderSelectState {
  isSelecting: boolean;
  type: "row" | "col" | null;
  startIndex: number | null;
  isMultipleMode: boolean;
}

const headerSelectState = ref<HeaderSelectState>({
  isSelecting: false,
  type: null,
  startIndex: null,
  isMultipleMode: false,
});

// DOM 查询缓存（优化性能，避免重调 querySelector）
const cellElementCache = new CellElementCache();

// 获取单元格DOM元素的函数（使用缓存优化）
const getCellElement = (row: number, col: number): HTMLElement | null => {
  if (!containerRef.value) return null;
  // 设置容器（如果变化）
  if (cellElementCache["container"] !== containerRef.value) {
    cellElementCache.setContainer(containerRef.value);
  }
  // 使用缓存查询
  return cellElementCache.getCellElement(row, col);
};

// --- Cell Menu Position 管理 ---
const { shouldShowCellMenu, createMenuContext } = useCellMenuPosition({
  editingCell,
  isSelecting,
  isMultipleMode,
  activeCell,
  normalizedSelection,
  multiSelections,
  tableData,
  updateCell,
  emitSync,
  getData,
  setDataWithSync,
  saveHistory: saveHistoryWithState,
  lastMousePosition,
  getCellElement,
});

/**
 * 处理自定义菜单项点击事件
 */
const handleCustomAction = (payload: {
  id: string;
  context: MenuContext;
}): void => {
  if (containerRef.value) {
    containerRef.value.focus();
  }
  emit("custom-action", payload);
};

/**
 * 处理菜单可见性变化
 */
const handleMenuVisibleChange = (visible: boolean): void => {
  if (visible) {
    updateMenuStates();
  }
};

/**
 * 处理容器点击事件（点击容器空白区域时清除选择）
 *
 * 只在点击事件真正冒泡到容器自身（而不是子元素）时才清除，
 * 通过 event.target === event.currentTarget 判断，比比对 classList
 * 更严谨、且不会被 spacer 等子元素误触发。
 */
const handleContainerClick = (event: MouseEvent): void => {
  if (event.target === event.currentTarget) {
    clearSelection();
  }
};

/**
 * 处理行号鼠标按下事件
 */
const handleRowNumberMouseDown = (
  rowIndex: number,
  event: MouseEvent,
): void => {
  // 如果正在调整行高，不处理选择
  if (props.enableRowResize && rowHeightComposable?.isResizingRow.value) {
    return;
  }

  if (stopEdit) {
    stopEdit();
  }

  const isCtrlClick = event && (event.ctrlKey || event.metaKey);
  headerSelectState.value = {
    isSelecting: true,
    type: "row",
    startIndex: rowIndex,
    isMultipleMode: isCtrlClick,
  };

  // 全选该行
  selectRow(rowIndex, internalColumns.value.length, isCtrlClick);

  // 注册全局事件
  window.addEventListener("mouseup", handleHeaderMouseUp);
};

/**
 * 处理列标题鼠标按下事件
 */
const handleColumnHeaderMouseDown = (
  colIndex: number,
  event: MouseEvent,
): void => {
  // 如果正在调整列宽，不处理选择
  if (
    props.enableColumnResize &&
    columnWidthComposable?.isResizingColumn.value
  ) {
    return;
  }

  if (stopEdit) {
    stopEdit();
  }

  const isCtrlClick = event && (event.ctrlKey || event.metaKey);
  headerSelectState.value = {
    isSelecting: true,
    type: "col",
    startIndex: colIndex,
    isMultipleMode: isCtrlClick,
  };

  // 全选该列
  selectColumn(colIndex, rows.value.length, isCtrlClick);

  // 注册全局事件
  window.addEventListener("mouseup", handleHeaderMouseUp);
};

/**
 * 处理行号鼠标进入事件（拖选时）
 */
const handleRowNumberMouseEnter = (rowIndex: number): void => {
  if (
    !headerSelectState.value.isSelecting ||
    headerSelectState.value.type !== "row"
  ) {
    return;
  }

  const startRow = headerSelectState.value.startIndex;
  if (startRow === null) return;
  const endRow = rowIndex;
  selectRows(startRow, endRow, internalColumns.value.length);
};

/**
 * 处理列标题鼠标进入事件（拖选时）
 * @param {number} colIndex - 列索引
 */
const handleColumnHeaderMouseEnter = (colIndex: number): void => {
  if (
    !headerSelectState.value.isSelecting ||
    headerSelectState.value.type !== "col"
  ) {
    return;
  }

  const startCol = headerSelectState.value.startIndex;
  if (startCol === null) return;
  const endCol = colIndex;
  selectColumns(startCol, endCol, rows.value.length);
};

/**
 * 处理行号/列标题鼠标抬起事件
 */
const handleHeaderMouseUp = (event: MouseEvent): void => {
  if (!headerSelectState.value.isSelecting) return;

  // 保存鼠标位置
  lastMousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  // 清理状态
  headerSelectState.value = {
    isSelecting: false,
    type: null,
    startIndex: null,
    isMultipleMode: false,
  };

  // 移除事件监听
  window.removeEventListener("mouseup", handleHeaderMouseUp);
};

/**
 * 处理角单元格点击事件（全选整个表格）
 */
const handleCornerCellClick = (): void => {
  if (stopEdit) {
    stopEdit();
  }

  // 全选整个表格
  selectAll(rows.value.length, internalColumns.value.length);
};

// 使用键盘处理 composable
const { handleKeydown } = useKeyboard({
  activeCell,
  editingCell,
  normalizedSelection,
  moveActiveCell,
  saveHistory: saveHistoryWithState,
  undoHistory: undoHistoryWithState,
  redoHistory: redoHistoryWithState,
  startEdit,
  deleteSelection,
  tableData,
  rows, // 传递行引用，用于恢复行数量
  columns: internalColumns, // 传递列引用，用于恢复列数量
  insertRowBelow, // 传递基础插入行函数
  deleteRow, // 传递基础删除行函数
  selectionService: selectionServiceWithEvents,
  undoRedoService,
  isCellEditable,
  isUndoRedoInProgress,
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
  customMenuItems: props.customMenuItems, // 传递自定义菜单项配置
  handleCustomAction, // 传递自定义菜单项处理函数
  createMenuContext: (rowIndex: number) => createMenuContext(rowIndex), // 传递创建上下文函数
  copyToFavorites, // 传递程序化复制函数
  cutToFavorites,
  pasteFromFavorites, // 传递程序化粘贴函数
  emitSync,
  exitCopyMode, // 传递退出复制状态函数
  copiedRange, // 传递复制区域引用，用于判断是否处于复制状态
});

/**
 * 设置指定列的宽度
 */
const setColumnWidth = (colIndex: number, width: number): void => {
  if (props.enableColumnResize && columnWidthComposable) {
    columnWidthComposable.columnWidths.value.set(colIndex, width);
  }
};

// --- 10. 暴露方法给父组件 ---
/**
 * Excel 组件暴露的方法和属性
 *
 * 通过 ref 可以访问以下方法和属性：
 * - getData(): 获取表格数据的深拷贝
 * - setData(data): 设置整个表格数据
 * - updateCell(row, col, value): 更新单个单元格
 * - clearData(): 清空所有单元格数据
 * - setColumnWidth(colIndex, width): 设置指定列的宽度
 * - tableData: 表格数据的响应式引用（只读）
 * - on(event, handler) / off(event, handler): 订阅/取消订阅组件内部事件
 *   （change / modelUpdate / selection / history）
 */
defineExpose({
  /**
   * 获取表格数据
   * @method getData
   * @returns {string[][]} 表格数据的深拷贝
   * @description 返回当前表格数据的深拷贝，不会影响原始数据
   * @example
   * const data = excelRef.value.getData();
   * console.log(data); // [["A1", "B1"], ["A2", "B2"]]
   */
  getData,
  /**
   * 设置表格数据
   * @method setData
   * @param {string[][]} data - 新的表格数据
   * @description 设置整个表格的数据，会自动调整行列数以匹配新数据
   * @example
   * excelRef.value.setData([
   *   ["姓名", "年龄", "城市"],
   *   ["张三", "25", "北京"]
   * ]);
   */
  setData: setDataWithSync,
  /**
   * 更新单个单元格
   * @method updateCell
   * @param {number} row - 行索引（0开始）
   * @param {number} col - 列索引（0开始）
   * @param {string} value - 新值
   * @description 更新指定单元格的值，如果超出当前范围会自动扩展行
   * @example
   * excelRef.value.updateCell(0, 0, "新值");
   */
  updateCell: (row: number, col: number, value: string) => {
    runExternalUpdate(() => updateCell(row, col, value), {
      emitSync: true,
    });
  },
  /**
   * 清空表格数据
   */
  clearData: () => {
    runExternalUpdate(() => clearData(), {
      emitSync: true,
    });
  },
  /**
   * 获取当前表格数据（响应式引用）
   * 表格数据的响应式引用，可以直接访问但建议使用 getData() 获取深拷贝
   * @readonly
   * @example
   * const data = excelRef.value.tableData;
   * console.log(data.value);
   */
  tableData,
  /**
   * 设置指定列的宽度
   * @method setColumnWidth
   * @param {number} colIndex - 列索引（0开始）
   * @param {number} width - 宽度（像素）
   * @description 手动设置指定列的宽度，仅在启用列宽调整时生效
   * @example
   * excelRef.value.setColumnWidth(0, 150); // 设置第一列宽度为150px
   */
  setColumnWidth,
  /**
   * 订阅 Excel 内部事件（change / modelUpdate / selection / history）。
   * @example
   *   excelRef.value.on("change", ({ data }) => { ... });
   */
  on: eventBus.on,
  /**
   * 取消订阅 Excel 内部事件。
   */
  off: eventBus.off,
});

// --- 11. 生命周期管理 ---
onMounted(() => {
  initHistory(tableData.value);

  // 初始刷新粘贴可用状态（非阻塞）
  void checkFavorites();
  // 监听窗口重新获得焦点，切换应用后及时刷新 canPaste
  window.addEventListener("focus", handleWindowFocus);

  // 初始化虚拟滚动
  nextTick(() => {
    if (containerRef.value && virtualScroll.enabled.value) {
      virtualScroll.init(containerRef.value, getRowHeight);
    }
  });
});

/**
 * 监听虚拟滚动启用状态 + 行高变化
 *
 * 注意：此处使用顶层 watch 而非 onMounted 内部 watch，原因：
 * 1. enabled 可能从 false 动态变为 true（如数据行数增长超过阈值），
 *    此时必须重新 init 虚拟滚动并开始监听行高变化。
 * 2. 放在 onMounted 里无法在 enabled 变化时重新绑定监听。
 */
watch(
  () => virtualScroll.enabled.value,
  (enabled) => {
    if (!enabled) return;
    nextTick(() => {
      if (containerRef.value) {
        virtualScroll.init(containerRef.value, getRowHeight);
      }
    });
  },
);

if (rowHeightComposable) {
  watch(
    () => rowHeightComposable?.rowHeights.value,
    () => {
      invalidateRowPrefix();
      clearCellDisplayCache();
      if (virtualScroll.enabled.value) {
        virtualScroll.updateVisibleRange();
      }
    },
    { deep: true },
  );
}

if (columnWidthComposable) {
  watch(
    () => columnWidthComposable.columnWidths.value,
    () => {
      clearCellDisplayCache();
    },
    { deep: true },
  );
}

// 行数变化时同样需要重算前缀和（新增/删除行、初始化等）
watch(
  () => rows.value.length,
  () => {
    invalidateRowPrefix();
  },
);

// 监听容器引用变化，更新缓存
watch(containerRef, (newContainer) => {
  if (newContainer) {
    cellElementCache.setContainer(newContainer);
  }
});

onUnmounted(() => {
  // 只清理 Excel.vue 自己挂载的全局监听。
  // 说明：
  // - useMouseEvents 内部会在 handleMouseUp 触发时自行移除 window mouseup/mousemove 监听；
  //   这里不再重复 remove，避免造成"看起来对其实无效"的维护噪音。
  // - useResizeHandlers 的 mousemove 监听同样由 useMouseEvents.handleMouseUp 负责移除。
  // - useFillHandle 的全局监听通过 cleanup() 统一清理（以 composable 是否存在为准，
  //   而非当前 prop，避免 init-only prop 被违规切换后出现漏清）。
  window.removeEventListener("mouseup", handleHeaderMouseUp);
  window.removeEventListener("focus", handleWindowFocus);

  if (fillHandleComposable) {
    fillHandleComposable.cleanup();
  }

  eventBus.clear();

  clearInputRefs();
  cellElementCache.clear();
  virtualScroll.cleanup();
});
</script>

<style lang="scss">
// ==================== 变量定义 ====================
// 颜色方案
$border-color: #e4e7ed;
$primary-color: #409eff;
$selection-bg: rgba(64, 158, 255, 0.12);
$header-bg: #f5f7fa;
$header-active-bg: #e4e7ed;
$text-primary: #303133;
$text-secondary: #606266;
$text-placeholder: #909399;
$cell-bg: #ffffff;
$cell-hover-bg: #f5f7fa;
$white: #fff;

// 尺寸
$border-width: 1px;
$selection-border-width: 2px;
$border-radius: 8px;
$cell-padding-h: 11px;
$cell-padding-v: 1px;
$container-padding: 0;
$container-margin: 0;

$row-number-width: 40px;
$default-row-height: 36px;

// 字体
$font-size-base: 14px;
$font-size-header: 13px;
$line-height: 1.5;
$font-weight-normal: 400;
$font-weight-bold: 600;

// Z-index 层级
$z-index-base: 1;
$z-index-header: 5;
$z-index-active: 10;
$z-index-selection: 11;
$z-index-selection-overlay: 12;
$z-index-drag-target: 13;
$z-index-fill-handle: 15;
$z-index-resizer: 20;

// 过渡动画
$transition-fast: 0.05s ease;
$transition-normal: 0.15s ease;
$transition-slow: 0.2s;

// 字体
$font-family:
  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
  "Segoe UI Symbol", "Noto Color Emoji";

// ==================== 容器样式 ====================
.excel-container {
  padding: $container-padding;
  margin: $container-margin;
  overflow-y: auto;
  overflow-x: hidden; // 隐藏横向滚动条
  outline: none;
  font-family: $font-family;
  width: 100%;
  height: var(--excel-container-height, 100%);
  min-height: 0; // 强制 min-height 为 0，防止 flex 布局下被内容撑开
  max-height: var(--excel-container-max-height, none);
  box-sizing: border-box;

  // ==================== 滚动条美化 ====================
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: content-box;

    &:hover {
      background: #c0c4cc;
      background-clip: content-box;
    }
  }

  // 兼容 Firefox
  scrollbar-width: thin;
  scrollbar-color: #dcdfe6 transparent;
}

.excel-table {
  display: block;
  background: transparent;
  font-size: $font-size-base;
  // overflow: hidden 会破坏 position: sticky 的定位链
  // 使用 overflow: visible 让 sticky 相对于 .excel-container 定位
  overflow: visible;
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: $border-radius;

  // ==================== 第一行（sticky 表头）边框处理 ====================
  // Sticky 表头需要完整的外边框（上、左、右）和圆角
  .excel-row:first-child {
    .excel-cell:first-child {
      border-top: $border-width solid $border-color;
      border-left: $border-width solid $border-color;
      border-top-left-radius: $border-radius;

      &.selection-top::after,
      &.active::after {
        top: 0;
        left: 0;
      }
    }

    .excel-cell:last-child {
      border-top: $border-width solid $border-color;
      border-right: $border-width solid $border-color;
      border-top-right-radius: $border-radius;

      &.selection-top::after,
      &.active::after {
        top: 0;
        right: 0;
      }
    }

    // 表头行的中间单元格（非第一个和最后一个）只需要上边框
    .excel-cell:not(:first-child):not(:last-child) {
      border-top: $border-width solid $border-color;

      &.selection-top::after,
      &.active::after {
        top: 0;
      }
    }
  }

  // ==================== 最后一行边框处理 ====================
  .excel-row:last-child {
    .excel-cell:first-child {
      border-bottom: $border-width solid $border-color;
      border-left: $border-width solid $border-color;
      border-bottom-left-radius: $border-radius;

      &.selection-bottom::after,
      &.active::after {
        bottom: 0;
        left: 0;
      }
    }

    .excel-cell:last-child {
      border-bottom: $border-width solid $border-color;
      border-right: $border-width solid $border-color;
      border-bottom-right-radius: $border-radius;

      &.selection-bottom::after,
      &.active::after {
        bottom: 0;
        right: 0;
      }
    }

    // 最后一行的中间单元格只需要下边框
    .excel-cell:not(:first-child):not(:last-child) {
      border-bottom: $border-width solid $border-color;

      &.selection-bottom::after,
      &.active::after {
        bottom: 0;
      }
    }
  }

  // ==================== 只有单行时的特殊处理 ====================
  // 当只有一行时（既是第一行也是最后一行），需要完整边框和四个圆角
  .excel-row:first-child:last-child {
    .excel-cell:first-child {
      border-top: $border-width solid $border-color;
      border-left: $border-width solid $border-color;
      border-bottom: $border-width solid $border-color;
      border-top-left-radius: $border-radius;
      border-bottom-left-radius: $border-radius;
    }

    .excel-cell:last-child {
      border-top: $border-width solid $border-color;
      border-right: $border-width solid $border-color;
      border-bottom: $border-width solid $border-color;
      border-top-right-radius: $border-radius;
      border-bottom-right-radius: $border-radius;
    }

    .excel-cell:not(:first-child):not(:last-child) {
      border-top: $border-width solid $border-color;
      border-bottom: $border-width solid $border-color;
    }
  }

  // ==================== 中间行（非第一行和非最后一行）左右边框 ====================
  .excel-row:not(:first-child):not(:last-child) {
    .excel-cell:first-child {
      border-left: $border-width solid $border-color;

      &.selection-left::after,
      &.active::after {
        left: 0;
      }
    }

    .excel-cell:last-child {
      border-right: $border-width solid $border-color;

      &.selection-right::after,
      &.active::after {
        right: 0;
      }
    }
  }
}

.excel-row {
  display: flex;
  margin: 0;
  padding: 0;
}

.header-row-sticky {
  position: sticky;
  top: 0;
  z-index: $z-index-header;
  background: $header-bg;
}

// ==================== 单元格样式====================
.excel-cell {
  // 基础样式
  border-right: $border-width solid $border-color;
  border-bottom: $border-width solid $border-color;
  padding: 0 $cell-padding-v;
  display: flex;
  background: $cell-bg;
  cursor: cell;
  position: relative;
  box-sizing: border-box;
  color: $text-secondary;
  flex-shrink: 0;
  overflow: visible;
  transition: background-color $transition-fast;

  // 交互状态
  &:hover:not(.active):not(.in-selection):not(.header-cell):not(.row-number) {
    background-color: $cell-hover-bg;
  }

  &.in-selection {
    background-color: $selection-bg;
  }

  // 多选背景色
  &.multi-select {
    background-color: #f5f7fa;
  }

  // 选中边框伪元素（统一管理）
  &::after {
    content: "";
    position: absolute;
    top: -$border-width;
    left: -$border-width;
    right: -$border-width;
    bottom: -$border-width;
    border: 0 solid $primary-color;
    pointer-events: none;
    z-index: $z-index-selection-overlay;
  }

  // 选中边框方向控制
  &.selection-top {
    z-index: $z-index-selection;

    &::after {
      border-top-width: $selection-border-width;
    }
  }

  &.selection-bottom {
    border-bottom-color: transparent;
    z-index: $z-index-selection;

    &::after {
      border-bottom-width: $selection-border-width;
    }
  }

  &.selection-left {
    z-index: $z-index-selection;

    &::after {
      border-left-width: $selection-border-width;
    }
  }

  &.selection-right {
    border-right-color: transparent;
    z-index: $z-index-selection;

    &::after {
      border-right-width: $selection-border-width;
    }
  }

  // 激活状态
  &.active {
    z-index: $z-index-active !important;
    background-color: $white;
    border-color: transparent;

    &::after {
      border: $selection-border-width solid $primary-color;
    }
  }

  // 复制状态：虚线边框
  &.copy-mode {
    &.selection-top,
    &.selection-bottom,
    &.selection-left,
    &.selection-right {
      &::after {
        border-style: dashed !important;
      }
    }

    &.active {
      &::after {
        border-style: dashed !important;
      }
    }
  }

  // 拖拽填充目标
  &.drag-target {
    z-index: $z-index-drag-target;
    background-color: rgba($primary-color, 0.1);

    // 默认不绘制边框，只在边界绘制虚线
    &::after {
      border: 0 dashed $primary-color;
    }

    // 顶部边界
    &.drag-target-top {
      &::after {
        border-top-width: $border-width;
      }
    }

    // 底部边界
    &.drag-target-bottom {
      border-bottom-color: transparent; // 避免与相邻单元格边框重叠

      &::after {
        border-bottom-width: $border-width;
      }
    }

    // 左侧边界
    &.drag-target-left {
      &::after {
        border-left-width: $border-width;
      }
    }

    // 右侧边界
    &.drag-target-right {
      border-right-color: transparent; // 避免与相邻单元格边框重叠

      &::after {
        border-right-width: $border-width;
      }
    }
  }

  // 单元格内容
  .cell-content {
    display: block;
    width: 100%;
    padding: 0 $cell-padding-h;
    overflow: hidden;
    font-size: $font-size-base;
    line-height: $line-height;
    color: $text-secondary;
    white-space: nowrap;
    text-overflow: ellipsis;

    &.cell-text-wrap {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    &.cell-text-ellipsis {
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  // Element Plus Tooltip 包裹层：保持与 .cell-content 一致的宽度与省略行为
  :deep(.el-tooltip__trigger) {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  // 输入框
  .cell-input {
    padding: 0 $cell-padding-h;
    width: 100%;
    height: 100%;
    font-size: $font-size-base;
    font-weight: $font-weight-normal;
    color: $text-secondary;
  }
}

// ==================== 表头和行号====================
.header-cell,
.row-number {
  display: flex; // 确保flex 布局
  background: $header-bg;
  font-weight: $font-weight-bold;
  font-size: $font-size-header;
  color: $text-secondary;
  align-items: center;
  cursor: default;
  transition:
    background-color $transition-normal,
    color $transition-normal;

  &.active-header {
    background: $header-active-bg;
    color: $primary-color;
  }
}

.header-cell {
  position: relative;
  user-select: none;
  height: $default-row-height;
  min-height: $default-row-height;
  padding: 0 $cell-padding-h; // 与数据单元格对齐
  justify-content: flex-start; // 表头左对齐
  text-align: left;

  // 禁用 hover 效果
  &:hover {
    background-color: $header-bg !important;
  }

  &.active-header:hover {
    background-color: $header-active-bg !important;
  }
}

.row-number {
  min-width: $row-number-width;
  width: $row-number-width;
  align-items: center !important;
  display: flex !important;
  justify-content: center;
  text-align: center;

  // 禁用 hover 效果
  &:hover {
    background-color: $header-bg !important;
  }

  &.active-header:hover {
    background-color: $header-active-bg !important;
  }
}

// 角单元格：占据行号列的宽度，确保表头与数据行对齐
.corner-cell {
  min-width: $row-number-width;
  width: $row-number-width;
  padding: 0;
  justify-content: center;
  align-items: center;
}

// ==================== 输入框样式（独立定义）====================
.cell-input {
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  margin: 0;
  font-family: inherit;
  font-size: $font-size-base;
  font-weight: $font-weight-normal;
  color: $text-primary;
  line-height: $line-height;
}

// 单元格省略时 hover 的 Tooltip 气泡（teleported 到 body，需独立样式）
.excel-cell-tooltip {
  max-width: 320px;
  word-break: break-word;
}
</style>
