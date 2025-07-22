import { ref } from "vue";

/**
 * 表格编辑状态管理Hook
 */
export function useTableEditor() {
  const translationResult = ref([]);

  /**
   * 进入编辑状态时，关闭其他所有单元格的编辑状态
   * @param {number} rowIndex - 行索引
   * @param {string} columnType - 列类型 ('en', 'cn', 'jp')
   */
  const enterEditMode = (rowIndex, columnType) => {
    // 遍历所有行，关闭编辑状态
    translationResult.value.forEach((row, index) => {
      if (index === rowIndex) {
        // 对于当前行，只开启指定列的编辑状态，关闭其他列
        row.editing_en = columnType === "en";
        row.editing_cn = columnType === "cn";
        row.editing_jp = columnType === "jp";
      } else {
        // 对于其他行，关闭所有编辑状态
        row.editing_en = false;
        row.editing_cn = false;
        row.editing_jp = false;
      }
    });
  };

  /**
   * 设置翻译结果数据
   * @param {Array} data - 翻译结果数组
   */
  const setTranslationResult = (data) => {
    translationResult.value = data || [];
  };

  /**
   * 检查翻译结果是否为空
   * @returns {boolean} 是否为空
   */
  const isEmpty = () => {
    return translationResult.value.length === 0;
  };

  return {
    translationResult,
    enterEditMode,
    setTranslationResult,
    isEmpty,
  };
}
