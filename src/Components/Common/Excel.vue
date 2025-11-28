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
          v-for="(col, index) in columns"
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
        >
          {{ rowIndex + 1 }}
        </div>

        <div
          v-for="(col, colIndex) in columns"
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
          <span v-else>{{ tableData[rowIndex][colIndex] }}</span>

          <div
            v-if="shouldShowHandle(rowIndex, colIndex) && !editingCell"
            class="fill-handle"
            @mousedown.stop="startFillDrag(rowIndex, colIndex)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useHistory } from "../../composables/Excel/useHistory";
import { useSelection } from "../../composables/Excel/useSelection";
import { useExcelData } from "../../composables/Excel/useExcelData";
import { useKeyboard } from "../../composables/Excel/useKeyboard";
import { useColumnWidth } from "../../composables/Excel/useColumnWidth";
import { DEFAULT_CONFIG } from "../../composables/Excel/constants.js";

// --- 1. 核心逻辑组合 ---
const {
  columns,
  rows,
  tableData,
  getSmartValue,
  generateClipboardText,
  parsePasteData,
} = useExcelData();
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

// 列宽管理
const {
  getColumnWidth,
  startColumnResize: startColumnResizeBase,
  handleColumnResize,
  stopColumnResize,
  handleDoubleClickResize: handleDoubleClickResizeBase,
  isResizingColumn,
} = useColumnWidth({
  colsCount: columns.value.length,
});

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

const shouldShowHandle = (row, col) => {
  const range = normalizedSelection.value;
  if (!range) return false;
  return row === range.maxRow && col === range.maxCol;
};

/**
 * 开始调整列宽（包装函数，添加事件监听）
 * @param {number} colIndex - 列索引
 * @param {MouseEvent} event - 鼠标事件
 */
const startColumnResize = (colIndex, event) => {
  startColumnResizeBase(colIndex, event);
  window.addEventListener("mousemove", handleColumnResize);
  window.addEventListener("mouseup", handleMouseUp);
};

/**
 * 处理双击列边界自适应
 * @param {number} colIndex - 列索引
 */
const handleDoubleClickResize = (colIndex) => {
  handleDoubleClickResizeBase(
    colIndex,
    columns.value,
    tableData.value,
    rows.value.length
  );
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
    col >= columns.value.length
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
  } else if (isDraggingFill.value) {
    handleFillDragEnter(row, col);
  }
};

const handleMouseUp = () => {
  isSelecting.value = false;
  if (isDraggingFill.value) applyFill();
  if (isResizingColumn.value) stopColumnResize();
  window.removeEventListener("mouseup", handleMouseUp);
  window.removeEventListener("mousemove", handleColumnResize);
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
    col >= columns.value.length
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
    columns.value.length
  );
  nextTick(() => containerRef.value?.focus());
};

const handleInputTab = (event) => {
  stopEdit();
  moveActiveCell(
    0,
    event.shiftKey ? -1 : 1,
    rows.value.length,
    columns.value.length
  );
  nextTick(() => containerRef.value?.focus());
};

// --- 5. 列宽调整逻辑 ---

// --- 6. 拖拽填充逻辑 (Drag Fill) ---
const isDraggingFill = ref(false);
const dragStartCell = ref(null);
const dragEndCell = ref(null);

const startFillDrag = (row, col) => {
  const range = normalizedSelection.value;
  if (!range) return;
  isDraggingFill.value = true;
  dragStartCell.value = { row: range.maxRow, col }; // 从选区底部开始
  dragEndCell.value = { row, col };
  window.addEventListener("mouseup", handleMouseUp);
};

const handleFillDragEnter = (row, col) => {
  if (!dragStartCell.value) return;
  if (col === dragStartCell.value.col && row >= dragStartCell.value.row) {
    dragEndCell.value = { row, col };
  }
};

const isInDragArea = (row, col) => {
  if (!isDraggingFill.value || !dragStartCell.value || !dragEndCell.value)
    return false;
  return (
    col === dragStartCell.value.col &&
    row > dragStartCell.value.row &&
    row <= dragEndCell.value.row
  );
};

/**
 * 应用填充操作
 */
const applyFill = () => {
  if (!isDraggingFill.value || !dragStartCell.value || !dragEndCell.value) {
    return;
  }

  const start = dragStartCell.value;
  const end = dragEndCell.value;

  if (end.row > start.row) {
    saveHistory(tableData.value); // 填充前保存
    const baseValue = tableData.value[start.row]?.[start.col] ?? "";
    const colIndex = start.col;

    // 边界检查
    if (colIndex < 0 || colIndex >= columns.value.length) {
      console.warn(`Invalid column index: ${colIndex}`);
      return;
    }

    for (let r = start.row + 1; r <= end.row; r++) {
      if (r >= 0 && r < rows.value.length) {
        tableData.value[r][colIndex] = getSmartValue(baseValue, r - start.row);
      }
    }
  }

  // 清理状态
  isDraggingFill.value = false;
  dragStartCell.value = null;
  dragEndCell.value = null;
};

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
      if (r < 0 || r >= rows.value.length) {
        return; // 边界检查
      }

      rowArr.forEach((cellVal, cIndex) => {
        const c = startCol + cIndex;
        if (c >= 0 && c < columns.value.length && tableData.value[r]) {
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
  getMaxCols: () => columns.value.length,
});

// --- 9. 生命周期管理 ---
onMounted(() => {
  initHistory(tableData.value);
});

onUnmounted(() => {
  // 清理事件监听器，防止内存泄漏
  window.removeEventListener("mouseup", handleMouseUp);
  window.removeEventListener("mousemove", handleColumnResize);
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
  padding: 20px;
  overflow: auto;
  max-height: 600px;
  outline: none;
  font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.excel-table {
  display: inline-block;
  background: #fff;
  font-size: 13px;
  border-left: 1px solid $border-color;
  border-top: 1px solid $border-color;
  user-select: none;
}
.excel-row {
  display: flex;
}
.excel-cell {
  height: 28px;
  border-right: 1px solid $border-color;
  border-bottom: 1px solid $border-color;
  padding: 0 6px;
  display: flex;
  align-items: center;
  background: #fff;
  cursor: cell;
  position: relative;
  box-sizing: border-box;
  color: #333;
  flex-shrink: 0;

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
.corner-cell,
.row-number {
  min-width: 40px;
  width: 40px;
}
.cell-input {
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
