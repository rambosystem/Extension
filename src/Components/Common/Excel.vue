## 修改组件需要遵守的规则并同步更新Excel_README.md
<template>
  <div
    class="excel-container"
    @keydown="handleKeydown"
    @copy="handleCopy"
    @paste="handlePaste"
    tabindex="0"
    ref="containerRef"
  >
    <div class="excel-table" @mouseleave="handleMouseUp">
      <div class="excel-row header-row">
        <div class="excel-cell header-cell corner-cell"></div>
        <div
          v-for="(col, index) in displayColumns"
          :key="col"
          class="excel-cell header-cell"
          :class="{ 'active-header': isInSelectionHeader(index, 'col') }"
          :style="
            index === displayColumns.length - 1
              ? {
                  flex: 1,
                  minWidth: getColumnWidth(index) + 'px',
                }
              : {
                  width: getColumnWidth(index) + 'px',
                  minWidth: getColumnWidth(index) + 'px',
                }
          "
        >
          {{ col }}
          <ColumnResizer
            v-if="enableColumnResize && index < displayColumns.length - 1"
            @mousedown="startColumnResize(index, $event)"
            @dblclick="handleDoubleClickResize(index)"
          />
        </div>
      </div>

      <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="excel-row">
        <div
          class="excel-cell row-number"
          :class="{ 'active-header': isInSelectionHeader(rowIndex, 'row') }"
          :style="{
            height: getRowHeight(rowIndex) + 'px',
            minHeight: getRowHeight(rowIndex) + 'px',
          }"
        >
          {{ rowIndex + 1 }}
          <RowResizer
            v-if="enableRowResize"
            @mousedown="startRowResize(rowIndex, $event)"
            @dblclick="handleDoubleClickRowResize(rowIndex)"
          />
        </div>

        <div
          v-for="(col, colIndex) in internalColumns"
          :key="colIndex"
          class="excel-cell"
          :class="[
            {
              // 仅在非多选状态下，才显示 active 样式
              active: isActive(rowIndex, colIndex) && !isMultiSelect,
              'in-selection': isInSelection(rowIndex, colIndex),
              'multi-select':
                isMultiSelect && isInSelection(rowIndex, colIndex),
              'drag-target': isInDragArea(rowIndex, colIndex),
            },
            getSelectionBorderClass(rowIndex, colIndex),
            getMultipleDragBorderClass(rowIndex, colIndex),
            getDragTargetBorderClass(rowIndex, colIndex),
          ]"
          :style="{
            ...(colIndex === internalColumns.length - 1
              ? { flex: 1, minWidth: getColumnWidth(colIndex) + 'px' }
              : {
                  width: getColumnWidth(colIndex) + 'px',
                  minWidth: getColumnWidth(colIndex) + 'px',
                }),
            height: getRowHeight(rowIndex) + 'px',
            minHeight: getRowHeight(rowIndex) + 'px',
            alignItems: getCellDisplayStyle(rowIndex, colIndex).align,
          }"
          @mousedown="
            handleCellMouseDown(
              rowIndex,
              colIndex,
              rows.length,
              internalColumns.length,
              $event
            )
          "
          @dblclick="startEdit(rowIndex, colIndex)"
          @mouseenter="handleMouseEnter(rowIndex, colIndex)"
        >
          <input
            v-if="isEditing(rowIndex, colIndex)"
            v-model="tableData[rowIndex][colIndex]"
            class="cell-input"
            @blur="stopEdit"
            @keydown.enter.prevent.stop="handleInputEnter"
            @keydown.tab.prevent.stop="handleInputTab"
            @keydown.esc="cancelEdit"
            :ref="(el) => setInputRef(el, rowIndex, colIndex)"
          />

          <span
            v-else
            class="cell-content"
            :class="{
              'cell-text-wrap': getCellDisplayStyle(rowIndex, colIndex).wrap,
              'cell-text-ellipsis': getCellDisplayStyle(rowIndex, colIndex)
                .ellipsis,
            }"
          >
            {{ tableData[rowIndex][colIndex] }}
          </span>

          <FillHandle
            v-if="
              enableFillHandle &&
              isSelectionBottomRight(rowIndex, colIndex) &&
              !editingCell
            "
            @mousedown="startFillDrag(rowIndex, colIndex)"
          />

          <!-- Cell Menu Button -->
          <CellMenu
            v-if="shouldShowCellMenu(rowIndex, colIndex)"
            :row-index="rowIndex"
            @command="handleCellMenuCommand"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue";
import { useHistory } from "../../composables/Excel/useHistory";
import { useSelection } from "../../composables/Excel/useSelection";
import { useExcelData } from "../../composables/Excel/useExcelData";
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
import { useRowOperations } from "../../composables/Excel/useRowOperations";
import { useResizeHandlers } from "../../composables/Excel/useResizeHandlers";
import CellMenu from "../Excel/CellMenu.vue";
import FillHandle from "../Excel/FillHandle.vue";
import ColumnResizer from "../Excel/ColumnResizer.vue";
import RowResizer from "../Excel/RowResizer.vue";

/**
 * Excel 组件 Props
 *
 * @component Excel
 * @description 类 Excel 表格组件，支持单元格编辑、选择、复制粘贴、撤销重做、智能填充等功能
 */
const props = defineProps({
  /**
   * 是否启用列宽调整功能
   * @type {boolean}
   * @default true
   * @description 启用后可以通过拖拽列边界调整列宽，双击列边界自动适应内容宽度
   */
  enableColumnResize: {
    type: Boolean,
    default: true,
  },
  /**
   * 是否启用智能填充功能
   * @type {boolean}
   * @default true
   * @description 启用后会在选区右下角显示填充手柄，支持拖拽填充（支持数字递增和末尾数字递增）
   */
  enableFillHandle: {
    type: Boolean,
    default: true,
  },
  /**
   * 默认列宽（像素）
   * @type {number | Object}
   * @default 100
   * @description
   * - 数字类型：所有列使用相同的固定宽度
   * - 对象类型：{ key: number, others: number }，第一列使用 key 宽度，其他列使用 others 宽度
   * - 仅在禁用列宽调整时生效，或作为初始列宽
   * @example
   * // 所有列100px
   * :default-column-width="100"
   *
   * // 第一列120px，其他列平均分配
   * :default-column-width="{ key: 120, others: 150 }"
   */
  defaultColumnWidth: {
    type: [Number, Object],
    default: 100,
  },
  /**
   * 是否启用行高调整功能
   * @type {boolean}
   * @default true
   * @description 启用后可以通过拖拽行边界调整行高，双击行边界自动适应内容高度
   */
  enableRowResize: {
    type: Boolean,
    default: true,
  },
  /**
   * 默认行高（像素）
   * @type {number}
   * @default 36
   * @description 禁用行高调整时的固定行高，或作为初始行高
   */
  defaultRowHeight: {
    type: Number,
    default: 36,
  },
  /**
   * v-model 绑定的表格数据
   * @type {string[][]}
   * @default null
   * @description
   * - 二维字符串数组，每个元素代表一行，每行是一个字符串数组
   * - 支持双向绑定，数据变化会自动同步
   * - 如果传入数据，组件会根据数据自动计算行列数
   * @example
   * [
   *   ["姓名", "年龄", "城市"],
   *   ["张三", "25", "北京"],
   *   ["李四", "30", "上海"]
   * ]
   */
  modelValue: {
    type: Array,
    default: null,
  },
  /**
   * 自定义列标题
   * @type {string[]}
   * @default null
   * @description
   * - 如果不提供，则使用默认的 A, B, C, ..., Z, AA, AB, ... 格式
   * - 如果提供，会使用自定义的列标题（数量不足时用默认标题补齐）
   * @example
   * ["Key", "English", "Chinese", "Japanese"]
   */
  columnNames: {
    type: Array,
    default: null,
  },
});

/**
 * Excel 组件 Emits
 *
 * @emits {string[][]} update:modelValue - v-model 更新事件，当表格数据变化时触发
 * @emits {string[][]} change - 数据变化事件，返回当前表格数据的深拷贝
 */
const emit = defineEmits({
  /**
   * v-model 更新事件
   * @param {string[][]} data - 更新后的表格数据
   */
  "update:modelValue": (data) => Array.isArray(data),
  /**
   * 数据变化事件
   * @param {string[][]} data - 变化后的表格数据（深拷贝）
   */
  change: (data) => Array.isArray(data),
});

// --- 1. 核心逻辑组合 ---
const {
  columns: internalColumns,
  rows,
  tableData,
  getSmartValue,
  generateClipboardText,
  parsePasteData,
  setData,
  getData,
  updateCell,
  clearData,
  deleteRow,
  insertRowBelow,
} = useExcelData({
  initialData: props.modelValue,
});

// 使用自定义列标题或默认列标题（仅用于显示）
const displayColumns = computed(() => {
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
        return name || internalColumns.value[index];
      });
  }
  return internalColumns.value;
});
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
  updateSelectionEnd,
  isActive,
  isInSelection,
  isInSelectionHeader,
  moveActiveCell,
  // 兼容性函数
  setSelection,
  toggleSelectionAtCell,
  addCurrentSelectionToMulti,
} = useSelection();

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
const isMultiSelect = computed(() => {
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
    if (sel.minRow !== sel.maxRow || sel.minCol !== sel.maxCol) {
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
const getDefaultWidthForComposable = () => {
  if (
    typeof props.defaultColumnWidth === "object" &&
    props.defaultColumnWidth !== null
  ) {
    return props.defaultColumnWidth.others || 100;
  }
  return props.defaultColumnWidth || 100;
};

const columnWidthComposable = props.enableColumnResize
  ? useColumnWidth({
      defaultWidth: getDefaultWidthForComposable(),
      colsCount: internalColumns.value.length,
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
const containerRef = ref(null);

// --- 单元格编辑管理 ---
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
  tableData,
  activeCell,
  setSelection,
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
const applyFill = () => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.applyFill(
    tableData.value,
    rows.value.length,
    internalColumns.value.length
  );
};

const handleFillDragEnter = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.handleFillDragEnter(row, col);
};

const isInDragArea = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return false;
  return fillHandleComposable.isInDragArea(row, col);
};

// --- 选区样式管理 ---
const {
  getSelectionBorderClass,
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
  props,
});

// --- 鼠标事件管理（先定义，供 resize handlers 使用）---
// 定义临时函数引用
let handleMouseUpRef = null;
let handleColumnResizeRef = null;
let handleRowResizeRef = null;

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
  handleMouseUp: () => handleMouseUpRef?.(),
  handleColumnResize: null, // 不再需要，使用内部定义的 handleColumnResizeMove
  handleRowResize: null, // 不再需要，使用内部定义的 handleRowResizeMove
});

// 更新引用
handleColumnResizeRef = handleColumnResizeMove;
handleRowResizeRef = handleRowResizeMove;

// --- 鼠标事件管理 ---
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
  }
);

// 更新引用
handleMouseUpRef = handleMouseUp;

// 填充拖拽开始
const startFillDrag = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.startFillDrag(
    row,
    col,
    normalizedSelection.value,
    handleMouseUp
  );
};

// --- 剪贴板管理 ---
const { handleCopy, handlePaste } = useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  activeCell,
  rows,
  columns: internalColumns,
  generateClipboardText,
  parsePasteData,
  saveHistory,
});

// --- 8. 键盘主逻辑 ---
/**
 * 删除选区内容
 *
 * @param {Object} range - 选区范围 { minRow, maxRow, minCol, maxCol }
 */
const deleteSelection = (range) => {
  for (let r = range.minRow; r <= range.maxRow; r++) {
    if (!tableData.value[r]) continue; // 边界检查
    for (let c = range.minCol; c <= range.maxCol; c++) {
      if (tableData.value[r][c] !== undefined) {
        tableData.value[r][c] = "";
      }
    }
  }
};

// --- 数据同步管理 ---
const { notifyDataChange, initDataSync, setDataWithSync } = useDataSync({
  tableData,
  props,
  getData,
  setData,
  emit,
});

// 初始化数据同步监听
initDataSync();

// --- 行操作管理（统一的插入/删除行逻辑）---
const { handleInsertRowBelow, handleDeleteRow } = useRowOperations({
  tableData,
  rows,
  activeCell,
  columns: internalColumns,
  saveHistory,
  insertRowBelow,
  deleteRow,
  setSelection,
  notifyDataChange,
});

// --- Cell Menu 管理 ---
const { handleCellMenuCommand } = useCellMenu({
  handleInsertRowBelow,
  handleDeleteRow,
});

/**
 * 判断是否应该显示单元格菜单按钮
 *
 * 显示条件：
 * 1. 不在编辑状态
 * 2. 不在多选模式（isMultipleMode === false）
 * 3. 优先显示在选区左上角（如果框选了多个单元格），否则显示在活动单元格
 *
 * @param {number} rowIndex - 行索引
 * @param {number} colIndex - 列索引
 * @returns {boolean}
 */
const shouldShowCellMenu = (rowIndex, colIndex) => {
  // 如果正在编辑，不显示菜单
  if (editingCell.value) {
    return false;
  }

  // 如果处于多选模式，不显示菜单
  if (isMultipleMode.value) {
    return false;
  }

  // 优先检查：如果框选了多个单元格，菜单显示在选区左上角
  const selection = normalizedSelection.value;
  if (selection) {
    // 检查是否是多个单元格的选区
    const isMultiCellSelection =
      selection.minRow !== selection.maxRow ||
      selection.minCol !== selection.maxCol;

    // 如果是多个单元格的选区，且当前单元格是左上角，显示菜单
    if (
      isMultiCellSelection &&
      rowIndex === selection.minRow &&
      colIndex === selection.minCol
    ) {
      return true;
    }
  }

  // 否则，如果是活动单元格，显示菜单
  if (isActive(rowIndex, colIndex)) {
    return true;
  }

  return false;
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
  handleInsertRowBelow, // 使用统一的插入行处理函数
  handleDeleteRow, // 使用统一的删除行处理函数
  tableData,
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
});

// 注意：列宽初始化逻辑已移至 getColumnWidth 函数中处理
// 当 defaultColumnWidth 为对象类型时，getColumnWidth 会自动处理 Key 列和其他列的宽度
// 用户手动调整的宽度会保存在 columnWidthComposable.columnWidths Map 中，优先级最高

/**
 * 设置指定列的宽度
 * @param {number} colIndex - 列索引
 * @param {number} width - 宽度（像素）
 */
const setColumnWidth = (colIndex, width) => {
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
  updateCell: (row, col, value) => {
    updateCell(row, col, value);
    nextTick(() => {
      notifyDataChange();
    });
  },
  /**
   * 清空表格数据
   * @method clearData
   * @description 清空所有单元格的数据，但保持当前的行列数
   * @example
   * excelRef.value.clearData();
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
  &:hover:not(.active):not(.in-selection) {
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
}

.row-number {
  min-width: $row-number-width;
  width: $row-number-width;
  align-items: center !important;
  display: flex !important;
  justify-content: center;
  text-align: center;
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
