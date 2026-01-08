/**
 * 剪贴板管理 Composable
 *
 * 负责处理 Excel 组件的复制和粘贴操作
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.editingCell - 正在编辑的单元格
 * @param {import('vue').ComputedRef} context.normalizedSelection - 归一化选区
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {import('vue').Ref} context.activeCell - 活动单元格
 * @param {import('vue').Ref} context.rows - 行索引数组
 * @param {import('vue').Ref} context.columns - 列标题数组
 * @param {Function} context.generateClipboardText - 生成剪贴板文本
 * @param {Function} context.parsePasteData - 解析粘贴数据
 * @param {Function} context.saveHistory - 保存历史记录
 * @returns {Object} 返回剪贴板处理方法
 */
export function useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  activeCell,
  rows,
  columns,
  generateClipboardText,
  parsePasteData,
  saveHistory,
}) {
  /**
   * 生成列标题（支持超过26列）
   * @param {number} index - 列索引
   * @returns {string} 列标题
   */
  const generateColumnLabel = (index) => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  /**
   * 处理复制操作
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
            const currentCols = columns.value.length;
            tableData.value.push(Array.from({ length: currentCols }, () => ""));
          }
        }

        rowArr.forEach((cellVal, cIndex) => {
          const c = startCol + cIndex;
          if (c < 0) {
            return; // 不允许负列
          }

          // 如果超出当前列数，自动扩展
          if (c >= columns.value.length) {
            const currentLength = columns.value.length;
            for (let i = currentLength; i <= c; i++) {
              columns.value.push(generateColumnLabel(i));
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

  return {
    handleCopy,
    handlePaste,
  };
}
