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
        >
          {{ col }}
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
          @mousedown="handleCellMouseDown(rowIndex, colIndex)"
          @dblclick="startEdit(rowIndex, colIndex)"
          @mouseenter="handleMouseEnter(rowIndex, colIndex)"
        >
          <input
            v-if="
              editingCell?.row === rowIndex && editingCell?.col === colIndex
            "
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
import { ref, nextTick, onMounted, onUnmounted } from "vue";

// --- 基础数据 ---
const columns = ref(
  Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i))
);
const rows = ref(Array.from({ length: 15 }, (_, i) => i));
const tableData = ref(
  Array.from({ length: 15 }, () => Array.from({ length: 10 }, () => ""))
);

// --- 状态管理 ---
const containerRef = ref(null);
const activeCell = ref(null);
const editingCell = ref(null);
let beforeEditSnapshot = null;

const selectionStart = ref(null);
const selectionEnd = ref(null);
const isSelecting = ref(false);

// --- 历史记录 ---
const historyStack = ref([]);
const historyIndex = ref(-1);
const maxHistorySize = 50;

const deepCopyTableData = () => JSON.parse(JSON.stringify(tableData.value));

const saveHistory = (source = "unknown") => {
  const currentState = deepCopyTableData();
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  const lastState = historyStack.value[historyStack.value.length - 1];
  if (lastState && JSON.stringify(lastState) === JSON.stringify(currentState))
    return;

  historyStack.value.push(currentState);
  if (historyStack.value.length > maxHistorySize) {
    historyStack.value.shift();
  } else {
    historyIndex.value++;
  }
};

const initHistory = () => {
  historyStack.value = [deepCopyTableData()];
  historyIndex.value = 0;
};

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    tableData.value = JSON.parse(
      JSON.stringify(historyStack.value[historyIndex.value])
    );
  }
};

const redo = () => {
  if (historyIndex.value < historyStack.value.length - 1) {
    historyIndex.value++;
    tableData.value = JSON.parse(
      JSON.stringify(historyStack.value[historyIndex.value])
    );
  }
};

// --- 选区逻辑 ---
const getNormalizedSelection = () => {
  if (!selectionStart.value || !selectionEnd.value) return null;
  return {
    minRow: Math.min(selectionStart.value.row, selectionEnd.value.row),
    maxRow: Math.max(selectionStart.value.row, selectionEnd.value.row),
    minCol: Math.min(selectionStart.value.col, selectionEnd.value.col),
    maxCol: Math.max(selectionStart.value.col, selectionEnd.value.col),
  };
};

const isActive = (row, col) =>
  activeCell.value?.row === row && activeCell.value?.col === col;
const isInSelection = (row, col) => {
  const range = getNormalizedSelection();
  if (!range) return false;
  return (
    row >= range.minRow &&
    row <= range.maxRow &&
    col >= range.minCol &&
    col <= range.maxCol
  );
};
const isInSelectionHeader = (index, type) => {
  const range = getNormalizedSelection();
  if (!range) return false;
  return type === "row"
    ? index >= range.minRow && index <= range.maxRow
    : index >= range.minCol && index <= range.maxCol;
};
const shouldShowHandle = (row, col) => {
  const range = getNormalizedSelection();
  if (!range) return false;
  return row === range.maxRow && col === range.maxCol;
};

// --- 交互逻辑 ---
const cellInputRefs = new Map();
const setInputRef = (el, row, col) => {
  const key = `${row}-${col}`;
  el ? cellInputRefs.set(key, el) : cellInputRefs.delete(key);
};

// 核心修复函数：处理点击逻辑
const handleCellMouseDown = (row, col) => {
  // 1. 如果点击的是当前正在编辑的单元格，不做任何处理（允许用户在 input 内选中文本/移动光标）
  if (
    editingCell.value &&
    editingCell.value.row === row &&
    editingCell.value.col === col
  ) {
    return;
  }

  // 2. 如果正在编辑其他单元格，先强制结束编辑并保存
  if (editingCell.value) {
    stopEdit();
  }

  // 3. 开始新的选区（这部分之前被 return 拦截了，现在可以正常执行）
  isSelecting.value = true;
  activeCell.value = { row, col };
  selectionStart.value = { row, col };
  selectionEnd.value = { row, col };
  window.addEventListener("mouseup", handleMouseUp);
};

const handleMouseEnter = (row, col) => {
  if (isSelecting.value) {
    selectionEnd.value = { row, col };
  } else if (isDraggingFill.value) {
    handleFillDragEnter(row, col);
  }
};

const handleMouseUp = () => {
  if (isSelecting.value) isSelecting.value = false;
  if (isDraggingFill.value) applyFill();
  window.removeEventListener("mouseup", handleMouseUp);
};

// --- 复制 / 粘贴 核心逻辑 ---

const handleCopy = (event) => {
  if (editingCell.value) return;
  const range = getNormalizedSelection();
  if (!range) return;
  event.preventDefault();
  const rowsData = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    const rowData = [];
    for (let c = range.minCol; c <= range.maxCol; c++) {
      rowData.push(tableData.value[r][c]);
    }
    rowsData.push(rowData.join("\t"));
  }
  const textData = rowsData.join("\n");
  if (event.clipboardData) {
    event.clipboardData.setData("text/plain", textData);
  } else {
    navigator.clipboard.writeText(textData);
  }
};

const handlePaste = (event) => {
  if (editingCell.value) return;
  event.preventDefault();
  const clipboardText = (event.clipboardData || window.clipboardData).getData(
    "text"
  );
  if (!clipboardText) return;
  const pasteRows = clipboardText
    .split(/\r\n|\n|\r/)
    .filter((row) => row !== "");
  if (pasteRows.length === 0) return;
  saveHistory("paste");
  const startRow = activeCell.value ? activeCell.value.row : 0;
  const startCol = activeCell.value ? activeCell.value.col : 0;
  pasteRows.forEach((rowStr, rIndex) => {
    const currentRowIndex = startRow + rIndex;
    if (currentRowIndex >= rows.value.length) return;
    const cols = rowStr.split("\t");
    cols.forEach((cellValue, cIndex) => {
      const currentColIndex = startCol + cIndex;
      if (currentColIndex >= columns.value.length) return;
      tableData.value[currentRowIndex][currentColIndex] = cellValue;
    });
  });
};

// --- 编辑与填充逻辑 ---
const startEdit = (row, col, selectAll = true) => {
  beforeEditSnapshot = tableData.value[row][col];
  editingCell.value = { row, col };
  activeCell.value = { row, col };
  selectionStart.value = { row, col };
  selectionEnd.value = { row, col };

  setTimeout(() => {
    const key = `${row}-${col}`;
    const inputEl = cellInputRefs.get(key);
    if (inputEl) {
      inputEl.focus();
      if (selectAll) inputEl.select();
      else
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    }
  }, 0);
};

const stopEdit = () => {
  if (!editingCell.value) return;
  const { row, col } = editingCell.value;
  if (beforeEditSnapshot !== tableData.value[row][col]) {
    saveHistory("stopEdit");
  }
  editingCell.value = null;
  beforeEditSnapshot = null;
  containerRef.value?.focus();
};

const moveActiveCell = (rOffset, cOffset) => {
  if (!activeCell.value) return;
  const currentRow = activeCell.value.row;
  const currentCol = activeCell.value.col;
  const newRow = Math.max(
    0,
    Math.min(rows.value.length - 1, currentRow + rOffset)
  );
  const newCol = Math.max(
    0,
    Math.min(columns.value.length - 1, currentCol + cOffset)
  );
  const newPos = { row: newRow, col: newCol };
  activeCell.value = newPos;
  selectionStart.value = newPos;
  selectionEnd.value = newPos;
  nextTick(() => {
    containerRef.value?.focus();
  });
};

const finishEditAndMove = (rOffset, cOffset) => {
  stopEdit();
  moveActiveCell(rOffset, cOffset);
};

const handleInputEnter = (event) => {
  finishEditAndMove(event.shiftKey ? -1 : 1, 0);
};

const handleInputTab = (event) => {
  finishEditAndMove(0, event.shiftKey ? -1 : 1);
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

const isDraggingFill = ref(false);
const dragStartCell = ref(null);
const dragEndCell = ref(null);
const startFillDrag = (row, col) => {
  isDraggingFill.value = true;
  const range = getNormalizedSelection();
  dragStartCell.value = { row: range.maxRow, col: col };
  dragEndCell.value = { row, col };
  window.addEventListener("mouseup", handleMouseUp);
};
const handleFillDragEnter = (row, col) => {
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
const getSmartValue = (value, step) => {
  if (!value) return "";
  if (!isNaN(value) && value.trim() !== "") return String(Number(value) + step);
  const match = value.match(/^(.*?)(\d+)$/);
  if (match) return `${match[1]}${parseInt(match[2], 10) + step}`;
  return value;
};
const applyFill = () => {
  if (!isDraggingFill.value || !dragStartCell.value || !dragEndCell.value)
    return;
  const start = dragStartCell.value;
  const end = dragEndCell.value;
  if (end.row > start.row) {
    saveHistory("autoFill");
    const baseValue = tableData.value[start.row][start.col];
    const colIndex = start.col;
    for (let r = start.row + 1; r <= end.row; r++) {
      const step = r - start.row;
      tableData.value[r][colIndex] = getSmartValue(baseValue, step);
    }
  }
  isDraggingFill.value = false;
  dragStartCell.value = null;
  dragEndCell.value = null;
};

// --- 键盘逻辑 ---
const handleKeydown = (event) => {
  if (event.isComposing || event.keyCode === 229) return;
  if (!activeCell.value && !selectionStart.value) return;

  if ((event.ctrlKey || event.metaKey) && !editingCell.value) {
    if (event.key.toLowerCase() === "z") {
      event.shiftKey ? redo() : undo();
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === "y") {
      redo();
      event.preventDefault();
      return;
    }
  }

  if (editingCell.value) return;

  const { row, col } = event.shiftKey ? selectionEnd.value : activeCell.value;
  const maxRows = rows.value.length;
  const maxCols = columns.value.length;

  let nextRow = row;
  let nextCol = col;
  let moved = false;

  switch (event.key) {
    case "ArrowUp":
      nextRow = Math.max(0, row - 1);
      moved = true;
      break;
    case "ArrowDown":
      nextRow = Math.min(maxRows - 1, row + 1);
      moved = true;
      break;
    case "ArrowLeft":
      nextCol = Math.max(0, col - 1);
      moved = true;
      break;
    case "ArrowRight":
      nextCol = Math.min(maxCols - 1, col + 1);
      moved = true;
      break;
    case "Tab":
      event.preventDefault();
      if (event.shiftKey) {
        nextCol = Math.max(0, col - 1);
      } else {
        nextCol = Math.min(maxCols - 1, col + 1);
      }
      moved = true;
      break;
    case "Enter":
      event.preventDefault();
      if (event.shiftKey) {
        nextRow = Math.max(0, row - 1);
      } else {
        nextRow = Math.min(maxRows - 1, row + 1);
      }
      moved = true;
      break;
    case "Delete":
    case "Backspace":
      saveHistory("delete");
      const range = getNormalizedSelection();
      for (let r = range.minRow; r <= range.maxRow; r++) {
        for (let c = range.minCol; c <= range.maxCol; c++) {
          tableData.value[r][c] = "";
        }
      }
      event.preventDefault();
      return;
    default:
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        const currentActiveRow = activeCell.value.row;
        const currentActiveCol = activeCell.value.col;
        const originalValue =
          tableData.value[currentActiveRow][currentActiveCol];
        saveHistory("directInput");
        tableData.value[currentActiveRow][currentActiveCol] = event.key;
        startEdit(currentActiveRow, currentActiveCol, false);
        beforeEditSnapshot = originalValue;
        event.preventDefault();
      }
      break;
  }

  if (moved) {
    event.preventDefault();
    if (["Tab", "Enter"].includes(event.key) && !event.shiftKey) {
      activeCell.value = { row: nextRow, col: nextCol };
      selectionStart.value = { row: nextRow, col: nextCol };
      selectionEnd.value = { row: nextRow, col: nextCol };
    } else if (
      event.shiftKey &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      selectionEnd.value = { row: nextRow, col: nextCol };
    } else {
      activeCell.value = { row: nextRow, col: nextCol };
      selectionStart.value = { row: nextRow, col: nextCol };
      selectionEnd.value = { row: nextRow, col: nextCol };
    }
  }
};

onMounted(initHistory);
onUnmounted(() => window.removeEventListener("mouseup", handleMouseUp));
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
  min-width: 100px;
  width: 100px;
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
