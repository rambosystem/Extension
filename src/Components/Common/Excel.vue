## 修改组件需要遵守的规则并同步更新Excel_README.md
<template>
  <div class="excel-container" @keydown="handleKeydown" @copy="handleCopy" @paste="handlePaste"
    @click="handleContainerClick" tabindex="0" ref="containerRef">
    <div class="excel-table" @mouseleave="handleMouseUp">
      <div class="excel-row header-row">
        <div class="excel-cell header-cell corner-cell" @mousedown="handleCornerCellClick"></div>
        <div v-for="(col, index) in displayColumns" :key="col" class="excel-cell header-cell"
          :class="{ 'active-header': isInSelectionHeader(index, 'col') }" :style="index === displayColumns.length - 1
            ? {
              flex: 1,
              minWidth: getColumnWidth(index) + 'px',
            }
            : {
              width: getColumnWidth(index) + 'px',
              minWidth: getColumnWidth(index) + 'px',
            }
            " @mousedown="handleColumnHeaderMouseDown(index, $event)"
          @mouseenter="handleColumnHeaderMouseEnter(index)">
          {{ col }}
          <ColumnResizer v-if="
            enableColumnResize && Number(index) < displayColumns.length - 1
          " @mousedown.stop="startColumnResize(Number(index), $event)"
            @dblclick="handleDoubleClickResize(Number(index))" />
        </div>
      </div>

      <div v-for="(_row, rowIndex) in rows" :key="rowIndex" class="excel-row">
        <div class="excel-cell row-number" :class="{ 'active-header': isInSelectionHeader(rowIndex, 'row') }" :style="{
          height: getRowHeight(rowIndex) + 'px',
          minHeight: getRowHeight(rowIndex) + 'px',
        }" @mousedown="handleRowNumberMouseDown(rowIndex, $event)" @mouseenter="handleRowNumberMouseEnter(rowIndex)">
          {{ rowIndex + 1 }}
          <RowResizer v-if="enableRowResize" @mousedown.stop="startRowResize(rowIndex, $event)"
            @dblclick="handleDoubleClickRowResize(rowIndex)" />
        </div>

        <div v-for="(_col, colIndex) in internalColumns" :key="colIndex" class="excel-cell" :data-row="rowIndex"
          :data-col="colIndex" :class="[
            {
              // 仅在非多选状态下，才显示 active 样式
              active: isActive(rowIndex, colIndex) && !isMultiSelect,
              'in-selection': isInSelection(rowIndex, colIndex),
              'multi-select':
                isMultiSelect && isInSelection(rowIndex, colIndex),
              'drag-target': isInDragArea(rowIndex, colIndex),
            },
            getSelectionBorderClass(rowIndex, colIndex),
            getCopiedRangeBorderClass(rowIndex, colIndex),
            getMultipleDragBorderClass(rowIndex, colIndex),
            getDragTargetBorderClass(rowIndex, colIndex),
          ]" :style="{
            ...(colIndex === internalColumns.length - 1
              ? { flex: 1, minWidth: getColumnWidth(colIndex) + 'px' }
              : {
                width: getColumnWidth(colIndex) + 'px',
                minWidth: getColumnWidth(colIndex) + 'px',
              }),
            height: getRowHeight(rowIndex) + 'px',
            minHeight: getRowHeight(rowIndex) + 'px',
            alignItems: getCellDisplayStyle(rowIndex, colIndex).align,
          }" @mousedown="
            handleCellMouseDown(
              rowIndex,
              colIndex,
              rows.length,
              internalColumns.length,
              $event
            )
            " @dblclick="startEdit(rowIndex, colIndex)" @mouseenter="handleMouseEnter(rowIndex, colIndex)">
          <input v-if="isEditing(rowIndex, colIndex)" v-model="tableData[rowIndex][colIndex]" class="cell-input"
            @blur="stopEdit" @keydown.enter.prevent.stop="handleInputEnter" @keydown.tab.prevent.stop="handleInputTab"
            @keydown.esc="cancelEdit" :ref="(el) => setInputRef(el as HTMLInputElement | null, rowIndex, colIndex)" />

          <span v-else class="cell-content" :class="{
            'cell-text-wrap': getCellDisplayStyle(rowIndex, colIndex).wrap,
            'cell-text-ellipsis': getCellDisplayStyle(rowIndex, colIndex)
              .ellipsis,
          }">
            {{ tableData[rowIndex][colIndex] }}
          </span>

          <FillHandle v-if="
            enableFillHandle &&
            isSelectionBottomRight(rowIndex, colIndex) &&
            !editingCell
          " @mousedown="startFillDrag(rowIndex, colIndex)" />

          <!-- Cell Menu Button -->
          <CellMenu v-if="shouldShowCellMenu(rowIndex, colIndex)" :row-index="rowIndex"
            :custom-menu-items="customMenuItems" :context="createMenuContext(rowIndex)" :can-undo="canUndo"
            :can-redo="canRedo" :can-paste="canPaste" @command="handleCellMenuCommand"
            @custom-action="handleCustomAction" @visible-change="handleMenuVisibleChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue";
import { useHistory } from "../../composables/Excel/useHistory";
import { useSelection } from "../../composables/Excel/useSelection";
import { useExcelData } from "../../composables/Excel/useExcelData";
import { useExcelState } from "../../composables/Excel/useExcelState";
import { useKeyboard } from "../../composables/Excel/useKeyboard";
import { useColumnWidth } from "../../composables/Excel/useColumnWidth";
import { useRowHeight } from "../../composables/Excel/useRowHeight";
import { useFillHandle } from "../../composables/Excel/useFillHandle";
import { useCellEditing } from "../../composables/Excel/useCellEditing";
import { useClipboard } from "../../composables/Excel/useClipboard";
import { useCellDisplay } from "../../composables/Excel/useCellDisplay";
import { useSizeManager } from "../../composables/Excel/useSizeManager";
import { useSelectionStyle } from "../../composables/Excel/useSelectionStyle";
import { useMouseEvents } from "../../composables/Excel/useMouseEvents";
import { useDataSync } from "../../composables/Excel/useDataSync";
import { useCellMenu } from "../../composables/Excel/useCellMenu";
import { useCellMenuPosition } from "../../composables/Excel/useCellMenuPosition";
import { useResizeHandlers } from "../../composables/Excel/useResizeHandlers";
import type {
  ColumnWidthConfig,
  MenuContext,
  SelectionRange,
} from "../../composables/Excel/types";
import type { CustomMenuItem } from "../../composables/Excel/useKeyboard";
import CellMenu from "../Excel/CellMenu.vue";
import FillHandle from "../Excel/FillHandle.vue";
import ColumnResizer from "../Excel/ColumnResizer.vue";
import RowResizer from "../Excel/RowResizer.vue";

/**
 * Excel 组件 Props
 */
interface Props {
  enableColumnResize?: boolean;
  enableFillHandle?: boolean;
  defaultColumnWidth?: number | ColumnWidthConfig;
  enableRowResize?: boolean;
  defaultRowHeight?: number;
  modelValue?: string[][] | null;
  columnNames?: string[] | null;
  customMenuItems?: CustomMenuItem[];
}

const props = withDefaults(defineProps<Props>(), {
  enableColumnResize: true,
  enableFillHandle: true,
  defaultColumnWidth: 100,
  enableRowResize: true,
  defaultRowHeight: 36,
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

// 从统一状态获取数据引用
const { tableData, columns: internalColumns, rows } = excelState.data;

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
} = useSelection({ state: excelState.selection });

/**
 * 判断当前是否处于多单元格选区状态
 *
 * 判断逻辑：
 * 1. 如果处于 MULTIPLE 模式（isMultipleMode === true），返回 true
 * 2. 如果多选列表中有多个选区（multiSelections.length > 1），返回 true
 * 3. 如果多选列表中有一个选区，且该选区不是单格选区，返回 true
 * 4. 如果 selectionStart 和 selectionEnd 不相等，返回 true
 * 5. 否则返回 false
 */
const isMultiSelect = computed<boolean>(() => {
  // 1. 检查是否处于 MULTIPLE 模式
  if (isMultipleMode.value) {
    return true;
  }

  // 2. 检查多选列表中是否有多个选区
  if (multiSelections.value && multiSelections.value.length > 1) {
    return true;
  }

  // 3. 检查多选列表中是否有一个非单格选区
  if (multiSelections.value && multiSelections.value.length === 1) {
    const sel = multiSelections.value[0];
    if (sel && (sel.minRow !== sel.maxRow || sel.minCol !== sel.maxCol)) {
      return true;
    }
  }

  // 4. 检查当前选区是否是多单元格选区
  if (selectionStart.value && selectionEnd.value) {
    const { row: sr, col: sc } = selectionStart.value;
    const { row: er, col: ec } = selectionEnd.value;
    if (sr !== er || sc !== ec) {
      return true;
    }
  }

  return false;
});

const {
  initHistory,
  saveHistory,
  undo: undoHistory,
  redo: redoHistory,
  canUndo: canUndoFn,
  canRedo: canRedoFn,
  isUndoRedoInProgress,
} = useHistory();

// 智能填充管理（仅在启用时使用）
const fillHandleComposable = props.enableFillHandle
  ? useFillHandle({
    getSmartValue,
    saveHistory,
  })
  : null;

// 列宽管理（仅在启用时使用）
// 传入初始列数，Map会自动处理新增列（使用默认宽度）
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
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
  containerRef,
});

// --- 尺寸管理 ---
const { getColumnWidth, getRowHeight } = useSizeManager({
  props,
  columnWidthComposable,
  rowHeightComposable,
});

// --- 单元格显示样式管理 ---
const { getCellDisplayStyle } = useCellDisplay({
  tableData,
  getColumnWidth,
  getRowHeight,
});

// 智能填充相关函数
const applyFill = (): void => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.applyFill(
    tableData.value,
    rows.value.length,
    internalColumns.value.length
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

// --- 数据同步管理（需要在 useClipboard 之前，因为需要 notifyDataChange）---
const { notifyDataChange, initDataSync, setDataWithSync } = useDataSync({
  tableData,
  props,
  getData,
  setData,
  emit: (event: string, ...args: any[]) => {
    if (event === "update:modelValue") {
      emit("update:modelValue", args[0] as string[][]);
    } else if (event === "change") {
      emit("change", args[0] as string[][]);
    } else if (event === "custom-action") {
      emit("custom-action", args[0] as { id: string; context: MenuContext });
    }
  },
  initHistory, // 传递 initHistory 函数，用于在数据更新时重新初始化历史记录
  isUndoRedoInProgress, // 传递 isUndoRedoInProgress 函数，防止撤销/重做时清空历史
});

// 初始化数据同步监听
initDataSync();

// --- 剪贴板管理（使用统一状态）---
const {
  handleCopy,
  handlePaste,
  copyToClipboard,
  pasteFromClipboard,
  hasClipboardContent,
  copiedRange,
  exitCopyMode,
} = useClipboard({
  state: excelState,
  saveHistory,
  startSingleSelection,
  updateSingleSelectionEnd,
  notifyDataChange,
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

// --- 鼠标事件管理（先定义，供 resize handlers 使用）---
// 定义临时函数引用
let handleMouseUpRef: ((event: MouseEvent) => void) | null = null;

// --- 尺寸调整处理器 ---
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
  handleMouseUp: handleMouseUpRef,
});

// --- 鼠标事件管理 ---
const {
  handleMouseUp,
  handleCellMouseDown: originalHandleCellMouseDown,
  handleMouseEnter,
} = useMouseEvents({
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
});

// 包装 handleMouseUp，保存鼠标位置
const wrappedHandleMouseUp = (event: MouseEvent): void => {
  lastMousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
  handleMouseUp(event);
};

// 包装 handleCellMouseDown，让它注册包装后的 handleMouseUp
const handleCellMouseDown = (
  rowIndex: number,
  colIndex: number,
  maxRows: number,
  maxCols: number,
  event: MouseEvent | null = null
): void => {
  // 普通单元格选择，不需要特殊处理

  // 调用原始函数，但需要替换它内部注册的 mouseup 事件
  // 先移除可能存在的原始事件监听
  window.removeEventListener("mouseup", handleMouseUp);

  // 调用原始函数（它会重新注册 mouseup，但我们会在之后替换）
  originalHandleCellMouseDown(rowIndex, colIndex, maxRows, maxCols, event);

  // 移除原始注册的 handleMouseUp，注册我们的包装版本
  window.removeEventListener("mouseup", handleMouseUp);
  window.addEventListener("mouseup", wrappedHandleMouseUp);
};

// 更新引用
handleMouseUpRef = wrappedHandleMouseUp;

// 填充拖拽开始
function startFillDrag(row: number, col: number): void {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.startFillDrag(row, col, normalizedSelection.value, () =>
    handleMouseUp(new MouseEvent("mouseup"))
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
      if (tableData.value[r][c] !== undefined) {
        tableData.value[r][c] = "";
      }
    }
  }
};

// --- 行操作管理 ---
// 注意：行操作现在通过工具函数统一处理
// useKeyboard 和 useCellMenu 都直接使用 rowOperationHandler 工具函数
// 这样可以确保快捷键和菜单的行为完全一致

// --- Cell Menu 管理 ---
// 添加历史记录状态的响应式引用
const canUndo = ref(false);
const canRedo = ref(false);
const canPaste = ref(false);

// 更新历史记录状态
const updateHistoryState = () => {
  canUndo.value = canUndoFn();
  canRedo.value = canRedoFn();
};

// 检查剪贴板是否有内容
const checkClipboard = async () => {
  try {
    canPaste.value = await hasClipboardContent();
  } catch (error) {
    // 如果没有权限或者失败，假设剪贴板有内容
    canPaste.value = true;
  }
};

// 定期更新状态（在菜单打开时）
const updateMenuStates = () => {
  updateHistoryState();
  checkClipboard();
};

const { handleCellMenuCommand } = useCellMenu({
  copyToClipboard,
  pasteFromClipboard,
  undoHistory,
  redoHistory,
  tableData,
  rows,
  columns: internalColumns,
  activeCell,
  normalizedSelection,
  saveHistory,
  insertRowBelow,
  deleteRow,
  startSingleSelection,
  clearSelection,
  notifyDataChange,
});

// 行号和列标题选择状态（需要在 useCellMenuPosition 之前定义）
interface HeaderSelectState {
  isSelecting: boolean;
  type: "row" | "col" | null;
  startIndex: number | null;
  isMultipleMode: boolean;
  lastSelectType: "row" | "col" | null; // 保留最近一次的行/列选择类型，用于菜单位置计算
}

const headerSelectState = ref<HeaderSelectState>({
  isSelecting: false,
  type: null,
  startIndex: null,
  isMultipleMode: false,
  lastSelectType: null,
});

// 保存最后一次鼠标位置，用于菜单位置计算
const lastMousePosition = ref<{ x: number; y: number } | null>(null);

// 获取单元格DOM元素的函数
const getCellElement = (row: number, col: number): HTMLElement | null => {
  if (!containerRef.value) return null;
  // 通过data属性查找单元格
  return containerRef.value.querySelector(
    `.excel-cell[data-row="${row}"][data-col="${col}"]`
  ) as HTMLElement | null;
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
  notifyDataChange,
  getData,
  setDataWithSync,
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
 * 处理容器点击事件（点击空白区域时清除选择）
 */
const handleContainerClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  if (
    target === containerRef.value ||
    target.classList.contains("excel-container")
  ) {
    clearSelection();
  }
};

// handleCellMouseDown 已经在上面定义，这里不需要重新定义

/**
 * 处理行号鼠标按下事件
 */
const handleRowNumberMouseDown = (
  rowIndex: number,
  event: MouseEvent
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
    lastSelectType: null,
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
  event: MouseEvent
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
    lastSelectType: null,
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
    lastSelectType: null,
  };

  // 移除事件监听
  window.removeEventListener("mouseup", handleHeaderMouseUp);
};

/**
 * 处理角单元格点击事件（全选整个表格）
 */
const handleCornerCellClick = (_event: MouseEvent): void => {
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
  saveHistory,
  undoHistory,
  redoHistory,
  startEdit,
  deleteSelection,
  tableData,
  rows, // 传递行引用，用于恢复行数量
  columns: internalColumns, // 传递列引用，用于恢复列数量
  insertRowBelow, // 传递基础插入行函数
  deleteRow, // 传递基础删除行函数
  startSingleSelection, // 传递单行选择函数
  isUndoRedoInProgress,
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
  customMenuItems: props.customMenuItems, // 传递自定义菜单项配置
  handleCustomAction, // 传递自定义菜单项处理函数
  createMenuContext: (rowIndex: number) => createMenuContext(rowIndex), // 传递创建上下文函数
  copyToClipboard, // 传递程序化复制函数
  pasteFromClipboard, // 传递程序化粘贴函数
  clearSelection, // 传递清除选择函数，确保快捷键和菜单行为一致
  notifyDataChange, // 传递通知数据变化函数，确保快捷键和菜单行为一致
  exitCopyMode, // 传递退出复制状态函数
  copiedRange, // 传递复制区域引用，用于判断是否处于复制状态
});

// 注意：列宽初始化逻辑已移至 getColumnWidth 函数中处理
// 当 defaultColumnWidth 为对象类型时，getColumnWidth 会自动处理 Key 列和其他列的宽度
// 用户手动调整的宽度会保存在 columnWidthComposable.columnWidths Map 中，优先级最高

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
 *
 * 使用示例请参考组件文档：src/composables/Excel/README.md
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
   * @param {number} row - 行索引（从0开始）
   * @param {number} col - 列索引（从0开始）
   * @param {string} value - 新值
   * @description 更新指定单元格的值，如果超出当前范围会自动扩展行列
   * @example
   * excelRef.value.updateCell(0, 0, "新值");
   */
  updateCell: (row: number, col: number, value: string) => {
    updateCell(row, col, value);
    nextTick(() => {
      notifyDataChange();
    });
  },
  /**
   * 清空表格数据
   */
  clearData: () => {
    clearData();
    nextTick(() => {
      notifyDataChange();
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
   * @param {number} colIndex - 列索引（从0开始）
   * @param {number} width - 宽度（像素）
   * @description 手动设置指定列的宽度，仅在启用列宽调整时生效
   * @example
   * excelRef.value.setColumnWidth(0, 150); // 设置第一列宽度为150px
   */
  setColumnWidth,
});

// --- 11. 生命周期管理 ---
onMounted(() => {
  initHistory(tableData.value);
});

onUnmounted(() => {
  // 清理事件监听器，防止内存泄漏
  window.removeEventListener("mouseup", handleMouseUp);
  if (props.enableColumnResize) {
    window.removeEventListener("mousemove", handleColumnResizeMove);
  }
  if (props.enableRowResize) {
    window.removeEventListener("mousemove", handleRowResizeMove);
  }
  // 清理输入框引用
  clearInputRefs();
});
</script>

<style scoped lang="scss">
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
$container-padding: 10px 10px 20px 10px;
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
$z-index-selection: 2;
$z-index-drag-target: 3;
$z-index-selection-overlay: 5;
$z-index-resizer: 10;
$z-index-active: 10;
$z-index-fill-handle: 20;

// 过渡动画
$transition-fast: 0.05s ease;
$transition-normal: 0.15s ease;
$transition-slow: 0.2s;

// 字体族
$font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

// ==================== 容器样式 ====================
.excel-container {
  padding: $container-padding;
  overflow-y: auto;
  overflow-x: hidden; // 隐藏横向滚动条
  outline: none;
  font-family: $font-family;
  width: 100%;
  height: 100%; // 确保容器有高度，才能显示滚动条
  box-sizing: border-box;
}

.excel-table {
  display: block;
  background: transparent;
  font-size: $font-size-base;
  border: $border-width solid $border-color;
  border-radius: $border-radius;
  overflow: visible;
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  margin: 0;
  padding: 0;

  // 圆角处理：表头行的第一个和最后一个单元格需要圆角
  // 注意：表头行的单元格不需要上边框，因为表格容器已经提供了上边框
  .excel-row:first-child {
    .excel-cell:first-child {
      border-top: none; // 移除上边框，避免与表格上边框重叠
      border-left: none; // 移除左边框，避免与表格左边框重叠
      border-top-left-radius: $border-radius;
    }

    .excel-cell:last-child {
      border-top: none; // 移除上边框，避免与表格上边框重叠
      border-right: none; // 移除右边框，避免与表格右边框重叠
      border-top-right-radius: $border-radius;
    }

    // 表头行的其他单元格也移除上边框
    .excel-cell {
      border-top: none;
    }
  }

  // 底部圆角处理：最后一行的第一个和最后一个单元格需要圆角
  .excel-row:last-child {
    .excel-cell:first-child {
      border-bottom: none; // 移除下边框，避免与表格下边框重叠
      border-left: none; // 移除左边框，避免与表格左边框重叠
      border-bottom-left-radius: $border-radius;
    }

    .excel-cell:last-child {
      border-bottom: none; // 移除下边框，避免与表格下边框重叠
      border-right: none; // 移除右边框，避免与表格右边框重叠
      border-bottom-right-radius: $border-radius;
    }

    // 最后一行的其他单元格也移除下边框
    .excel-cell {
      border-bottom: none;
    }
  }

  // 所有行的第一个单元格移除左边框（由表格容器提供）
  .excel-row .excel-cell:first-child {
    border-left: none;
  }

  // 所有行的最后一个单元格移除右边框（由表格容器提供）
  .excel-row .excel-cell:last-child {
    border-right: none;
  }
}

.excel-row {
  display: flex;
  margin: 0;
  padding: 0;
}

// ==================== 单元格样式 ====================
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

// ==================== 表头和行号 ====================
.header-cell,
.row-number {
  display: flex; // 确保是 flex 布局
  background: $header-bg;
  font-weight: $font-weight-bold;
  font-size: $font-size-header;
  color: $text-secondary;
  align-items: center;
  cursor: default;
  transition: background-color $transition-normal, color $transition-normal;

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

// ==================== 输入框样式（独立定义） ====================
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
</style>
