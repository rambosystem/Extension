import { ref, onUnmounted } from "vue";

// 缓存 Canvas context 避免重复创建
let cachedCtx = null;
function getTextWidth(text, font = "13px sans-serif") {
  if (!text) return 0;
  if (!cachedCtx) {
    const canvas = document.createElement("canvas");
    cachedCtx = canvas.getContext("2d");
  }
  cachedCtx.font = font;
  const metrics = cachedCtx.measureText(text);
  return Math.ceil(metrics.width);
}

export function useColumnWidth({
  defaultWidth = 100,
  minWidth = 50,
  maxWidth = 500,
  fontStyle = "13px sans-serif",
} = {}) {
  // 状态
  const columnWidths = ref(new Map());
  const isResizingColumn = ref(false);
  const resizingColumnIndex = ref(null);

  // 临时变量
  let resizeStartX = 0;
  let resizeStartWidth = 0;
  let animationFrameId = null;

  const getColumnWidth = (colIndex) => {
    return columnWidths.value.get(colIndex) ?? defaultWidth;
  };

  /**
   * 处理拖拽逻辑
   * 包含 requestAnimationFrame 节流优化
   */
  const handleColumnResize = (event) => {
    if (!isResizingColumn.value) return;

    // 这一步是为了防止模板里绑定的 @mousemove 和 window 监听同时触发导致计算错误
    // 同时也为了性能
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(() => {
      const deltaX = event.clientX - resizeStartX;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, resizeStartWidth + deltaX)
      );

      columnWidths.value.set(resizingColumnIndex.value, newWidth);
    });
  };

  /**
   * 停止拖拽
   */
  const stopColumnResize = () => {
    isResizingColumn.value = false;
    resizingColumnIndex.value = null;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // 移除全局监听
    window.removeEventListener("mousemove", handleColumnResize);
    window.removeEventListener("mouseup", stopColumnResize);
    document.body.style.cursor = ""; // 恢复鼠标样式
  };

  /**
   * 开始调整
   */
  const startColumnResize = (colIndex, event) => {
    event.preventDefault();
    isResizingColumn.value = true;
    resizingColumnIndex.value = colIndex;
    resizeStartX = event.clientX;
    resizeStartWidth = getColumnWidth(colIndex);

    // 添加全局监听（即使鼠标移出表格也能继续拖拽）
    window.addEventListener("mousemove", handleColumnResize);
    window.addEventListener("mouseup", stopColumnResize);
    document.body.style.cursor = "col-resize"; // 强制鼠标样式
  };

  const autoFitColumn = (colIndex, columns, tableData) => {
    let maxContentWidth = defaultWidth;

    // 1. Header
    if (columns && columns[colIndex]) {
      const headerWidth = getTextWidth(String(columns[colIndex]), fontStyle);
      maxContentWidth = Math.max(maxContentWidth, headerWidth + 24);
    }

    // 2. Data (采样前 100 行)
    if (tableData && tableData.length > 0) {
      const sampleLimit = Math.min(tableData.length, 100);
      for (let r = 0; r < sampleLimit; r++) {
        const row = tableData[r];
        const cellValue = Array.isArray(row)
          ? row[colIndex]
          : row[Object.keys(row)[colIndex]];
        if (cellValue) {
          const strVal = String(cellValue);
          if (strVal.length > 0) {
            const width = getTextWidth(strVal, fontStyle);
            maxContentWidth = Math.max(maxContentWidth, width + 20);
          }
        }
      }
    }
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, maxContentWidth));
    columnWidths.value.set(colIndex, finalWidth);
  };

  const handleDoubleClickResize = (colIndex, columns, tableData) => {
    autoFitColumn(colIndex, columns, tableData);
  };

  // 必须手动销毁监听，防止组件卸载后残留
  onUnmounted(() => {
    window.removeEventListener("mousemove", handleColumnResize);
    window.removeEventListener("mouseup", stopColumnResize);
  });

  return {
    columnWidths,
    isResizingColumn,
    resizingColumnIndex,
    getColumnWidth,
    startColumnResize,

    // 关键修正：必须把这两个方法暴露出去，因为你的模板里绑定了它们
    handleColumnResize,
    stopColumnResize,

    handleDoubleClickResize,
    autoFitColumn,
  };
}
