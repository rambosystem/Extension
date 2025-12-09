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
          :class="{
            active: isActive(rowIndex, colIndex),
            'in-selection': isInSelection(rowIndex, colIndex),
            'drag-target': isInDragArea(rowIndex, colIndex),
          }"
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
              shouldShowHandle(rowIndex, colIndex) &&
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
    default: 28,
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
$border-color: #d0d7e5;
$primary-color: #4a90e2;
$selection-bg: rgba(74, 144, 226, 0.15);
$header-bg: #f8f9fa;
$header-active-bg: #e2e6ea;

.excel-container {
  padding: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 600px;
  outline: none;
  font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  width: 100%;
  box-sizing: border-box;
}

.excel-table {
  display: block;
  background: #fff;
  font-size: 13px;
  border-left: 1px solid $border-color;
  border-top: 1px solid $border-color;
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.excel-row {
  display: flex;
}

.excel-cell {
  border-right: 1px solid $border-color;
  border-bottom: 1px solid $border-color;
  padding: 0 6px;
  display: flex;
  // align-items 由 inline style 动态控制（默认垂直居中）
  background: #fff;
  cursor: cell;
  position: relative;
  box-sizing: border-box;
  color: #333;
  flex-shrink: 0;
  overflow: hidden; // 隐藏超出单元格的内容

  // 单元格内容样式
  > span {
    overflow: hidden;
    width: 100%;

    // [关键] 显式声明行高和字号，确保 JS 计算准确
    font-size: 13px;
    line-height: 1.4;

    // 默认/省略号模式：单行显示，超出显示省略号
    white-space: nowrap;
    text-overflow: ellipsis;

    // 换行模式：当列宽不够但行高足够时
    &.cell-text-wrap {
      white-space: normal;
      word-wrap: break-word; // 兼容旧版
      overflow-wrap: break-word; // 标准写法，防止长单词溢出
      word-break: break-word; // 优化英文断行体验
      text-overflow: clip;
    }

    // 省略号模式：当列宽和行高都不够时
    &.cell-text-ellipsis {
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  // 输入框样式
  > input {
    width: 100%;
    height: 100%;
  }

  &.in-selection {
    background-color: $selection-bg;
  }

  &.active {
    background-color: #fff;
    box-shadow: inset 0 0 0 2px $primary-color;
    z-index: 10;
  }

  &.drag-target {
    background-color: rgba($primary-color, 0.1);
    border-bottom: 1px dashed $primary-color;
    border-right: 1px dashed $primary-color;
  }
}

.fill-handle {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 7px;
  height: 7px;
  background-color: $primary-color;
  border: 1px solid #fff;
  cursor: crosshair;
  z-index: 20;
}

.header-cell,
.row-number {
  background: $header-bg;
  font-weight: 600;
  color: #666;
  justify-content: center;
  align-items: center; // 确保垂直居中
  text-align: center;
  cursor: default;

  &.active-header {
    background: $header-active-bg;
    color: $primary-color;
    font-weight: bold;
  }
}

.header-cell {
  position: relative;
  user-select: none;
  height: 28px; // 与默认行高一致
  min-height: 28px;
}

.column-resizer {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba($primary-color, 0.3);
  }

  &:active {
    background-color: rgba($primary-color, 0.5);
  }
}

.row-resizer {
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 6px;
  cursor: row-resize;
  z-index: 10;
  background: transparent;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba($primary-color, 0.3);
  }

  &:active {
    background-color: rgba($primary-color, 0.5);
  }
}

.corner-cell,
.row-number {
  min-width: 40px;
  width: 40px;
}

.row-number {
  align-items: center !important; // 确保垂直居中
  display: flex !important; // 确保 flex 布局生效
}

.cell-input {
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
</style>
