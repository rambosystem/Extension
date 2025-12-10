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
          :style="{
            width: getColumnWidth(index) + 'px',
            minWidth: getColumnWidth(index) + 'px',
          }"
        >
          {{ col }}
          <div
            v-if="enableColumnResize"
            class="column-resizer"
            @mousedown.stop="startColumnResize(index, $event)"
            @dblclick.stop="handleDoubleClickResize(index)"
          ></div>
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
          <div
            v-if="enableRowResize"
            class="row-resizer"
            @mousedown.stop="startRowResize(rowIndex, $event)"
            @dblclick.stop="handleDoubleClickRowResize(rowIndex)"
          ></div>
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
              'drag-target': isInDragArea(rowIndex, colIndex),
            },
            getSelectionBorderClass(rowIndex, colIndex),
            getDragTargetBorderClass(rowIndex, colIndex),
          ]"
          :style="{
            width: getColumnWidth(colIndex) + 'px',
            minWidth: getColumnWidth(colIndex) + 'px',
            height: getRowHeight(rowIndex) + 'px',
            minHeight: getRowHeight(rowIndex) + 'px',
            alignItems: getCellDisplayStyle(rowIndex, colIndex).align,
          }"
          @mousedown="handleCellMouseDown(rowIndex, colIndex)"
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

          <div
            v-if="
              enableFillHandle &&
              isSelectionBottomRight(rowIndex, colIndex) &&
              !editingCell
            "
            class="fill-handle"
            @mousedown.stop="startFillDrag(rowIndex, colIndex)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from "vue";
import { useHistory } from "../../composables/Excel/useHistory";
import { useSelection } from "../../composables/Excel/useSelection";
import { useExcelData } from "../../composables/Excel/useExcelData";
import { useKeyboard } from "../../composables/Excel/useKeyboard";
import { useColumnWidth } from "../../composables/Excel/useColumnWidth";
import { useRowHeight } from "../../composables/Excel/useRowHeight";
import { useFillHandle } from "../../composables/Excel/useFillHandle";
import { DEFAULT_CONFIG } from "../../composables/Excel/constants.js";

/**
 * 组件 Props
 */
const props = defineProps({
  /**
   * 是否启用列宽调整功能
   * @type {boolean}
   */
  enableColumnResize: {
    type: Boolean,
    default: true,
  },
  /**
   * 是否启用智能填充功能
   * @type {boolean}
   */
  enableFillHandle: {
    type: Boolean,
    default: true,
  },
  /**
   * 禁用列宽调整时的固定列宽（像素），支持数字或 { key: number, others: number }
   * @type {number | Object}
   */
  defaultColumnWidth: {
    type: [Number, Object],
    default: 100,
  },
  /**
   * 是否启用行高调整功能
   * @type {boolean}
   */
  enableRowResize: {
    type: Boolean,
    default: true,
  },
  /**
   * 禁用行高调整时的固定行高（像素）
   * @type {number}
   */
  defaultRowHeight: {
    type: Number,
    default: 36,
  },
  /**
   * v-model 绑定的表格数据
   * @type {string[][]}
   */
  modelValue: {
    type: Array,
    default: null,
  },
  /**
   * 自定义列标题（可选，如果不提供则使用默认的A, B, C...）
   * @type {string[]}
   */
  columnNames: {
    type: Array,
    default: null,
  },
});

/**
 * 组件 Emits
 */
const emit = defineEmits(["update:modelValue", "change"]);

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
  setSelection,
  updateSelectionEnd,
  isActive,
  isInSelection,
  isInSelectionHeader,
  moveActiveCell,
} = useSelection();

/**
 * 判断当前是否处于多单元格选区状态
 * 即 selectionStart 和 selectionEnd 不相等
 */
const isMultiSelect = computed(() => {
  if (!selectionStart.value || !selectionEnd.value) return false;
  const { row: sr, col: sc } = selectionStart.value;
  const { row: er, col: ec } = selectionEnd.value;
  return sr !== er || sc !== ec;
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

const getColumnWidth = (colIndex) => {
  if (props.enableColumnResize && columnWidthComposable) {
    // 1. 如果用户已手动调整过宽度，以 map 中的值为准
    const storedWidth = columnWidthComposable.columnWidths.value.get(colIndex);
    if (storedWidth !== undefined) {
      return storedWidth;
    }

    // 2. 如果未调整，检查 defaultColumnWidth 是否为对象（来自 TranslationResultDialog）
    if (
      typeof props.defaultColumnWidth === "object" &&
      props.defaultColumnWidth !== null
    ) {
      // 传入的是 { key: 120, others: avgWidth } 对象
      if (colIndex === 0) {
        return props.defaultColumnWidth.key || 120; // 第 0 列使用 Key 宽度 (120px)
      }
      return props.defaultColumnWidth.others || 100; // 其他列使用平均宽度
    }

    // 3. 如果 defaultColumnWidth 是数字，使用 composable 的默认逻辑
    return columnWidthComposable.getColumnWidth(colIndex);
  }

  // 4. 禁用列宽调整时或传入数字默认值时
  if (
    typeof props.defaultColumnWidth === "object" &&
    props.defaultColumnWidth !== null
  ) {
    // 即使禁用了调整，也要应用 Key 列特殊宽度
    return colIndex === 0
      ? props.defaultColumnWidth.key || 120
      : props.defaultColumnWidth.others || 100;
  }
  return props.defaultColumnWidth; // 默认值（Number类型）
};

const getRowHeight = (rowIndex) => {
  if (props.enableRowResize && rowHeightComposable) {
    return rowHeightComposable.getRowHeight(rowIndex);
  }
  return props.defaultRowHeight; // 禁用行高调整时使用固定值
};

// --- 辅助：计算文本真实显示宽度 ---
/**
 * 计算文本的真实显示宽度
 * 区分全角字符（汉字/全角标点，约 13px）和半角字符（英文/数字，约 7-8px）
 * @param {string} text - 文本内容
 * @returns {number} 文本宽度（像素）
 */
const getTextDisplayWidth = (text) => {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // ASCII 字符 (英文/数字) 算 8.5px，其他 (汉字等) 算 13.5px (对应 font-size: 13px)
    // 增加一点 buffer (0.5px) 防止渲染误差
    width += code < 256 ? 8.5 : 13.5;
  }
  return width;
};

/**
 * 优化后的显示逻辑
 * 根据列宽和行高智能判断：
 * - 如果列宽足够，单行显示，垂直居中
 * - 如果列宽不够但行高足够，换行显示，顶部对齐
 * - 如果都不够，显示省略号，垂直居中
 * @param {number} rowIndex - 行索引
 * @param {number} colIndex - 列索引
 * @returns {Object} 返回样式配置对象 { wrap, ellipsis, align }
 */
const getCellDisplayStyle = (rowIndex, colIndex) => {
  const cellValue = tableData.value[rowIndex]?.[colIndex] || "";
  const cellText = String(cellValue);

  if (!cellText) {
    return { wrap: false, ellipsis: false, align: "center" };
  }

  // 获取当前实时的行列尺寸
  const columnWidth = getColumnWidth(colIndex);
  const rowHeight = getRowHeight(rowIndex);

  // 基础样式参数 (需与 CSS 保持一致)
  const paddingH = 13; // 左右 padding (6+6) + border/buffer (1)
  const fontSize = 13;
  const lineHeightRatio = 1.4; // CSS line-height
  const lineHeightPx = fontSize * lineHeightRatio; // ~18.2px

  // 1. 计算文本内容的真实宽度
  const textWidth = getTextDisplayWidth(cellText);
  const availableWidth = columnWidth - paddingH;

  // 情况 A: 列宽足够 -> 单行显示，垂直居中
  if (textWidth <= availableWidth) {
    return { wrap: false, ellipsis: false, align: "center" };
  }

  // 情况 B: 列宽不够 -> 计算需要折多少行
  // 估算每行能放多少像素，保守计算减去一点右侧 buffer
  const lineContentWidth = availableWidth - 2;
  // 即使是 0 也要保证至少有一行，防止除以 0
  const linesNeeded = Math.ceil(textWidth / Math.max(lineContentWidth, 1));

  // 计算所需高度 (行数 * 行高 + 上下 padding 4px)
  const requiredHeight = linesNeeded * lineHeightPx + 4;

  // 如果当前行高 >= 所需高度 -> 允许换行，垂直居中
  if (rowHeight >= requiredHeight) {
    return { wrap: true, ellipsis: false, align: "center" };
  }

  // 情况 C: 空间实在不够 -> 强制单行省略，垂直居中
  return { wrap: false, ellipsis: true, align: "center" };
};

const startColumnResizeBase = (colIndex, event) => {
  if (props.enableColumnResize && columnWidthComposable) {
    columnWidthComposable.startColumnResize(colIndex, event);
  }
};

const handleColumnResize = (event) => {
  if (props.enableColumnResize && columnWidthComposable) {
    columnWidthComposable.handleColumnResize(event);
  }
};

const stopColumnResize = () => {
  if (props.enableColumnResize && columnWidthComposable) {
    columnWidthComposable.stopColumnResize();
  }
};

// 行高调整相关函数
const startRowResizeBase = (rowIndex, event) => {
  if (props.enableRowResize && rowHeightComposable) {
    rowHeightComposable.startRowResize(rowIndex, event);
  }
};

const handleRowResize = (event) => {
  if (props.enableRowResize && rowHeightComposable) {
    rowHeightComposable.handleRowResize(event);
  }
};

const stopRowResize = () => {
  if (props.enableRowResize && rowHeightComposable) {
    rowHeightComposable.stopRowResize();
  }
};

const handleDoubleClickRowResizeBase = (rowIndex) => {
  if (props.enableRowResize && rowHeightComposable) {
    rowHeightComposable.handleDoubleClickResize(
      rowIndex,
      tableData.value,
      internalColumns.value.length,
      getColumnWidth // 传入获取列宽的函数
    );
  }
};

// 智能填充相关函数
const applyFill = () => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.applyFill(
    tableData.value,
    rows.value.length,
    internalColumns.value.length
  );
};

const shouldShowHandle = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return false;
  return fillHandleComposable.shouldShowHandle(
    row,
    col,
    normalizedSelection.value
  );
};

/**
 * 获取选区边界的 Class
 * 我们将返回具体的方位组合，以便 CSS 使用 box-shadow 渲染
 */
const getSelectionBorderClass = (row, col) => {
  if (!isInSelection(row, col)) return [];

  const selection = normalizedSelection.value;
  if (!selection) return [];

  const classes = [];
  // 判断四个方向是否是边界
  if (row === selection.minRow) classes.push("selection-top");
  if (row === selection.maxRow) classes.push("selection-bottom");
  if (col === selection.minCol) classes.push("selection-left");
  if (col === selection.maxCol) classes.push("selection-right");

  return classes;
};

/**
 * 判断是否为选区的右下角（用于显示填充手柄）
 * 替代原有的 shouldShowHandle，逻辑更直观
 */
const isSelectionBottomRight = (row, col) => {
  if (!normalizedSelection.value) return false;
  const { maxRow, maxCol } = normalizedSelection.value;
  return row === maxRow && col === maxCol;
};

/**
 * 获取拖拽填充区域边界的 Class
 * 只在边界绘制虚线边框，避免相邻单元格边框重叠
 */
const getDragTargetBorderClass = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return [];
  if (!isInDragArea(row, col)) return [];

  const { dragStartCell, dragEndCell } = fillHandleComposable;
  if (!dragStartCell.value || !dragEndCell.value) return [];

  const startRow = dragStartCell.value.row;
  const endRow = dragEndCell.value.row;
  const colIndex = dragStartCell.value.col;

  // 只处理拖拽列
  if (col !== colIndex) return [];

  const classes = [];
  // 判断边界：顶部是第一个拖拽单元格，底部是最后一个拖拽单元格
  // 注意：拖拽区域从 startRow + 1 开始
  if (row === startRow + 1) classes.push("drag-target-top");
  if (row === endRow) classes.push("drag-target-bottom");
  // 左右边界都是该列
  classes.push("drag-target-left");
  classes.push("drag-target-right");

  return classes;
};

const handleFillDragEnter = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.handleFillDragEnter(row, col);
};

const isInDragArea = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return false;
  return fillHandleComposable.isInDragArea(row, col);
};

// --- 4. 鼠标事件处理 ---
/**
 * 处理鼠标抬起事件
 */
const handleMouseUp = () => {
  isSelecting.value = false;
  if (props.enableFillHandle && fillHandleComposable?.isDraggingFill.value) {
    applyFill();
  }
  if (
    props.enableColumnResize &&
    columnWidthComposable?.isResizingColumn.value
  ) {
    stopColumnResize();
  }
  if (props.enableRowResize && rowHeightComposable?.isResizingRow.value) {
    stopRowResize();
  }
  window.removeEventListener("mouseup", handleMouseUp);
  if (props.enableColumnResize) {
    window.removeEventListener("mousemove", handleColumnResize);
  }
  if (props.enableRowResize) {
    window.removeEventListener("mousemove", handleRowResize);
  }
};

const startFillDrag = (row, col) => {
  if (!props.enableFillHandle || !fillHandleComposable) return;
  fillHandleComposable.startFillDrag(
    row,
    col,
    normalizedSelection.value,
    handleMouseUp
  );
};

const handleDoubleClickResizeBase = (colIndex) => {
  if (props.enableColumnResize && columnWidthComposable) {
    columnWidthComposable.handleDoubleClickResize(
      colIndex,
      internalColumns.value,
      tableData.value,
      rows.value.length
    );
  }
};

// --- 2. 状态管理 ---
const containerRef = ref(null);
const editingCell = ref(null); // { row, col }
let beforeEditSnapshot = null;

// DOM Refs for Inputs
const cellInputRefs = new Map();
const setInputRef = (el, row, col) => {
  if (!el) return;
  const key = `${row}-${col}`;
  cellInputRefs.set(key, el);
};

// --- 3. 辅助函数 ---
const isEditing = (row, col) =>
  editingCell.value?.row === row && editingCell.value?.col === col;

/**
 * 开始调整列宽（包装函数，添加事件监听）
 * @param {number} colIndex - 列索引
 * @param {MouseEvent} event - 鼠标事件
 */
const startColumnResize = (colIndex, event) => {
  if (!props.enableColumnResize) return;
  startColumnResizeBase(colIndex, event);
  window.addEventListener("mousemove", handleColumnResize);
  window.addEventListener("mouseup", handleMouseUp);
};

/**
 * 开始调整行高（包装函数，添加事件监听）
 * @param {number} rowIndex - 行索引
 * @param {MouseEvent} event - 鼠标事件
 */
const startRowResize = (rowIndex, event) => {
  if (!props.enableRowResize) return;
  startRowResizeBase(rowIndex, event);
  window.addEventListener("mousemove", handleRowResize);
  window.addEventListener("mouseup", handleMouseUp);
};

/**
 * 处理双击行边界自适应
 * @param {number} rowIndex - 行索引
 */
const handleDoubleClickRowResize = (rowIndex) => {
  if (!props.enableRowResize) return;
  handleDoubleClickRowResizeBase(rowIndex);
};

/**
 * 处理双击列边界自适应
 * @param {number} colIndex - 列索引
 */
const handleDoubleClickResize = (colIndex) => {
  if (!props.enableColumnResize) return;
  handleDoubleClickResizeBase(colIndex);
};

// --- 4. 交互逻辑 (鼠标 & 编辑) ---

/**
 * 处理单元格鼠标按下事件
 *
 * @param {number} row - 行索引
 * @param {number} col - 列索引
 */
const handleCellMouseDown = (row, col) => {
  // 边界检查
  if (
    row < 0 ||
    row >= rows.value.length ||
    col < 0 ||
    col >= internalColumns.value.length
  ) {
    return;
  }

  if (isEditing(row, col)) {
    return;
  }

  if (editingCell.value) {
    stopEdit(); // 切换焦点前保存旧的编辑
  }

  isSelecting.value = true;
  setSelection(row, col);
  window.addEventListener("mouseup", handleMouseUp);
};

const handleMouseEnter = (row, col) => {
  if (isSelecting.value) {
    updateSelectionEnd(row, col);
  } else if (
    props.enableFillHandle &&
    fillHandleComposable?.isDraggingFill.value
  ) {
    handleFillDragEnter(row, col);
  }
};

/**
 * 开始编辑单元格
 *
 * @param {number} row - 行索引
 * @param {number} col - 列索引
 * @param {boolean} selectAll - 是否全选文本，默认 true
 */
const startEdit = (row, col, selectAll = true) => {
  // 边界检查
  if (
    row < 0 ||
    row >= rows.value.length ||
    col < 0 ||
    col >= internalColumns.value.length
  ) {
    console.warn(`Invalid cell position: row=${row}, col=${col}`);
    return;
  }

  beforeEditSnapshot = tableData.value[row][col];
  editingCell.value = { row, col };
  setSelection(row, col); // 确保编辑时选中该单元格

  // 使用 nextTick 确保 DOM 更新后再聚焦
  nextTick(() => {
    const key = `${row}-${col}`;
    const inputEl = cellInputRefs.get(key);
    if (inputEl) {
      inputEl.focus();
      if (selectAll) {
        inputEl.select();
      } else {
        const length = inputEl.value.length;
        inputEl.setSelectionRange(length, length);
      }
    }
  });
};

const stopEdit = () => {
  if (!editingCell.value) return;
  const { row, col } = editingCell.value;

  if (beforeEditSnapshot !== tableData.value[row][col]) {
    saveHistory(tableData.value); // 数据变动保存历史
    // 数据变化会自动通过 watch 触发 notifyDataChange
  }

  editingCell.value = null;
  beforeEditSnapshot = null;
  containerRef.value?.focus();
};

const cancelEdit = () => {
  if (editingCell.value && beforeEditSnapshot !== null) {
    const { row, col } = editingCell.value;
    tableData.value[row][col] = beforeEditSnapshot;
  }
  editingCell.value = null;
  beforeEditSnapshot = null;
  containerRef.value?.focus();
};

const handleInputEnter = (event) => {
  stopEdit();
  moveActiveCell(
    event.shiftKey ? -1 : 1,
    0,
    rows.value.length,
    internalColumns.value.length
  );
  nextTick(() => containerRef.value?.focus());
};

const handleInputTab = (event) => {
  stopEdit();
  moveActiveCell(
    0,
    event.shiftKey ? -1 : 1,
    rows.value.length,
    internalColumns.value.length
  );
  nextTick(() => containerRef.value?.focus());
};

// --- 5. 列宽调整逻辑 ---

// --- 6. 拖拽填充逻辑 (Drag Fill) ---
// 已在上面定义，使用 fillHandleComposable

// --- 7. 剪贴板逻辑 ---
/**
 * 处理复制操作
 *
 * @param {ClipboardEvent} event - 剪贴板事件
 */
const handleCopy = (event) => {
  if (editingCell.value || !normalizedSelection.value) {
    return;
  }

  event.preventDefault();
  const textData = generateClipboardText(
    normalizedSelection.value,
    tableData.value
  );

  try {
    if (event.clipboardData) {
      event.clipboardData.setData("text/plain", textData);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(textData).catch((error) => {
        console.warn("Failed to write to clipboard:", error);
      });
    }
  } catch (error) {
    console.warn("Copy operation failed:", error);
  }
};

/**
 * 处理粘贴操作
 *
 * @param {ClipboardEvent} event - 剪贴板事件
 */
const handlePaste = (event) => {
  if (editingCell.value) {
    return;
  }

  event.preventDefault();

  try {
    const text =
      (event.clipboardData || window.clipboardData)?.getData("text") || "";
    const pasteData = parsePasteData(text);

    if (pasteData.length === 0) {
      return;
    }

    saveHistory(tableData.value); // 粘贴前保存

    const startRow = activeCell.value?.row ?? 0;
    const startCol = activeCell.value?.col ?? 0;

    pasteData.forEach((rowArr, rIndex) => {
      const r = startRow + rIndex;
      if (r < 0) {
        return; // 不允许负行
      }

      // 如果超出当前行数，自动扩展
      if (r >= rows.value.length) {
        const currentLength = rows.value.length;
        for (let i = currentLength; i <= r; i++) {
          rows.value.push(i);
          const currentCols = internalColumns.value.length;
          tableData.value.push(Array.from({ length: currentCols }, () => ""));
        }
      }

      rowArr.forEach((cellVal, cIndex) => {
        const c = startCol + cIndex;
        if (c < 0) {
          return; // 不允许负列
        }

        // 如果超出当前列数，自动扩展
        if (c >= internalColumns.value.length) {
          const currentLength = internalColumns.value.length;
          // 生成列标题（支持超过26列）
          const generateColumnLabel = (index) => {
            if (index < 26) {
              return String.fromCharCode(65 + index);
            }
            const first = Math.floor((index - 26) / 26);
            const second = (index - 26) % 26;
            return (
              String.fromCharCode(65 + first) + String.fromCharCode(65 + second)
            );
          };
          for (let i = currentLength; i <= c; i++) {
            internalColumns.value.push(generateColumnLabel(i));
          }
          // 为所有行补齐列
          tableData.value.forEach((rowData) => {
            while (rowData.length <= c) {
              rowData.push("");
            }
          });
        }

        if (tableData.value[r]) {
          tableData.value[r][c] = cellVal;
        }
      });
    });
  } catch (error) {
    console.warn("Paste operation failed:", error);
  }
};

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
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
});

// --- 9. 数据同步和监听 ---
/**
 * 通知外部数据变化
 */
const notifyDataChange = () => {
  if (props.modelValue !== null) {
    // 只有在使用 v-model 时才 emit
    const data = getData();
    emit("update:modelValue", data);
  }
  emit("change", getData());
};

// 监听内部数据变化（深度监听，使用 nextTick 避免频繁触发）
let isUpdatingFromExternal = false;
watch(
  tableData,
  () => {
    if (!isUpdatingFromExternal) {
      nextTick(() => {
        notifyDataChange();
      });
    }
  },
  { deep: true }
);

// 监听外部数据变化（props.modelValue）
watch(
  () => props.modelValue,
  (newValue) => {
    // 处理 null、undefined、空数组和有效数组
    if (props.modelValue !== null && Array.isArray(newValue)) {
      // 只有当外部数据真正变化时才更新（避免循环更新）
      const currentData = JSON.stringify(getData());
      const newData = JSON.stringify(newValue);
      if (currentData !== newData) {
        isUpdatingFromExternal = true;
        setData(newValue);
        nextTick(() => {
          isUpdatingFromExternal = false;
        });
      }
    }
  },
  { deep: true, immediate: false }
);

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
defineExpose({
  /**
   * 获取表格数据
   * @returns {string[][]} 表格数据的深拷贝
   */
  getData,
  /**
   * 设置表格数据
   * @param {string[][]} data - 新的表格数据
   */
  setData: (data) => {
    isUpdatingFromExternal = true;
    setData(data);
    nextTick(() => {
      isUpdatingFromExternal = false;
      notifyDataChange();
    });
  },
  /**
   * 更新单个单元格
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {string} value - 新值
   */
  updateCell: (row, col, value) => {
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
   * @returns {Ref<string[][]>} 表格数据引用
   */
  tableData,
  /**
   * 设置指定列的宽度
   * @param {number} colIndex - 列索引
   * @param {number} width - 宽度（像素）
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
    window.removeEventListener("mousemove", handleColumnResize);
  }
  if (props.enableRowResize) {
    window.removeEventListener("mousemove", handleRowResize);
  }
  // 清理输入框引用
  cellInputRefs.clear();
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
$resizer-width: 6px;
$resizer-offset: -3px;
$fill-handle-size: 7px;
$fill-handle-offset: -4px;

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

// ==================== 填充手柄 ====================
.fill-handle {
  position: absolute;
  right: $fill-handle-offset;
  bottom: $fill-handle-offset;
  width: $fill-handle-size;
  height: $fill-handle-size;
  background-color: $primary-color;
  border: $border-width solid $white;
  cursor: crosshair;
  z-index: $z-index-fill-handle;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.2);
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

// ==================== 调整器（Resizer） ====================
%resizer-base {
  position: absolute;
  z-index: $z-index-resizer;
  background: transparent;
  transition: background-color $transition-slow;

  &:hover {
    background-color: rgba($primary-color, 0.3);
  }

  &:active {
    background-color: rgba($primary-color, 0.5);
  }
}

.column-resizer {
  @extend %resizer-base;
  top: 0;
  right: $resizer-offset;
  width: $resizer-width;
  height: 100%;
  cursor: col-resize;
}

.row-resizer {
  @extend %resizer-base;
  left: 0;
  bottom: $resizer-offset;
  width: 100%;
  height: $resizer-width;
  cursor: row-resize;
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
