/**
 * 尺寸调整处理器管理 Composable
 *
 * 负责处理列宽和行高的调整操作（拖拽和双击自适应）
 *
 * @param {Object} context - 上下文对象
 * @param {Object} context.props - 组件 props
 * @param {Object} context.columnWidthComposable - 列宽管理 composable
 * @param {Object} context.rowHeightComposable - 行高管理 composable
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {import('vue').Ref} context.columns - 列标题数组
 * @param {Function} context.getColumnWidth - 获取列宽函数
 * @param {Function} context.handleMouseUp - 处理鼠标抬起
 * @param {Function} context.handleColumnResize - 处理列宽调整
 * @param {Function} context.handleRowResize - 处理行高调整
 * @returns {Object} 返回尺寸调整处理方法
 */
export function useResizeHandlers({
  props,
  columnWidthComposable,
  rowHeightComposable,
  tableData,
  columns,
  getColumnWidth,
  handleMouseUp,
  handleColumnResize,
  handleRowResize,
}) {
  /**
   * 处理列宽调整（事件处理）
   * @param {MouseEvent} event - 鼠标事件
   */
  const handleColumnResizeMove = (event) => {
    if (props.enableColumnResize && columnWidthComposable) {
      columnWidthComposable.handleColumnResize(event);
    }
  };

  /**
   * 处理行高调整（事件处理）
   * @param {MouseEvent} event - 鼠标事件
   */
  const handleRowResizeMove = (event) => {
    if (props.enableRowResize && rowHeightComposable) {
      rowHeightComposable.handleRowResize(event);
    }
  };

  /**
   * 开始调整列宽（包装函数，添加事件监听）
   * @param {number} colIndex - 列索引
   * @param {MouseEvent} event - 鼠标事件
   */
  const startColumnResize = (colIndex, event) => {
    if (!props.enableColumnResize) return;
    if (columnWidthComposable) {
      columnWidthComposable.startColumnResize(colIndex, event);
    }
    window.addEventListener("mousemove", handleColumnResizeMove);
    if (handleMouseUp) {
      window.addEventListener("mouseup", handleMouseUp);
    }
  };

  /**
   * 开始调整行高（包装函数，添加事件监听）
   * @param {number} rowIndex - 行索引
   * @param {MouseEvent} event - 鼠标事件
   */
  const startRowResize = (rowIndex, event) => {
    if (!props.enableRowResize) return;
    if (rowHeightComposable) {
      rowHeightComposable.startRowResize(rowIndex, event);
    }
    window.addEventListener("mousemove", handleRowResizeMove);
    if (handleMouseUp) {
      window.addEventListener("mouseup", handleMouseUp);
    }
  };

  /**
   * 停止列宽调整
   */
  const stopColumnResize = () => {
    if (props.enableColumnResize && columnWidthComposable) {
      columnWidthComposable.stopColumnResize();
    }
  };

  /**
   * 停止行高调整
   */
  const stopRowResize = () => {
    if (props.enableRowResize && rowHeightComposable) {
      rowHeightComposable.stopRowResize();
    }
  };

  /**
   * 处理双击列边界自适应
   * @param {number} colIndex - 列索引
   */
  const handleDoubleClickResize = (colIndex) => {
    if (!props.enableColumnResize) return;
    if (columnWidthComposable) {
      columnWidthComposable.handleDoubleClickResize(
        colIndex,
        columns.value,
        tableData.value,
        tableData.value.length
      );
    }
  };

  /**
   * 处理双击行边界自适应
   * @param {number} rowIndex - 行索引
   */
  const handleDoubleClickRowResize = (rowIndex) => {
    if (!props.enableRowResize) return;
    if (rowHeightComposable) {
      rowHeightComposable.handleDoubleClickResize(
        rowIndex,
        tableData.value,
        columns.value.length,
        getColumnWidth
      );
    }
  };

  return {
    startColumnResize,
    startRowResize,
    stopColumnResize,
    stopRowResize,
    handleDoubleClickResize,
    handleDoubleClickRowResize,
    handleColumnResizeMove,
    handleRowResizeMove,
  };
}
