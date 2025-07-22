import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useTranslation } from "./useTranslation.js";
import { useCSVExport } from "./useCSVExport.js";
import { useTranslationStorage } from "./useTranslationStorage.js";
import { useTableEditor } from "./useTableEditor.js";

/**
 * 翻译管理主Hook - 整合所有翻译相关功能
 */
export function useTranslationManager() {
  // 基础状态
  const codeContent = ref("");
  const dialogVisible = ref(false);

  // 使用各个功能模块
  const translation = useTranslation();
  const csvExport = useCSVExport();
  const storage = useTranslationStorage();
  const editor = useTableEditor();

  /**
   * 执行翻译并处理结果
   */
  const handleTranslate = async () => {
    try {
      const result = await translation.performTranslation(codeContent.value);

      // 设置表格数据
      editor.setTranslationResult(result);

      // 提取纯数据并保存到存储
      const translationData = translation.extractTranslationData(result);
      storage.saveTranslationToLocal(translationData);

      // 显示结果对话框
      dialogVisible.value = true;
    } catch (error) {
      // 错误已在translation.performTranslation中处理
      console.error("Translation failed:", error);
    }
  };

  /**
   * 显示上次翻译结果
   */
  const showLastTranslation = () => {
    if (storage.hasLastTranslation()) {
      // 为加载的数据添加编辑状态属性
      const dataWithEditState = storage.addEditingStates(
        storage.lastTranslation.value
      );
      editor.setTranslationResult(dataWithEditState);
      dialogVisible.value = true;
    } else {
      ElMessage.warning("No previous translation result found");
    }
  };

  /**
   * 导出CSV文件
   */
  const exportCSV = () => {
    if (editor.isEmpty()) {
      ElMessage.warning("No translation data to export");
      return;
    }
    csvExport.exportCSV(editor.translationResult.value);
  };

  /**
   * 导出CSV并上传到Lokalise
   */
  const exportCSVAndUpload = () => {
    if (editor.isEmpty()) {
      ElMessage.warning("No translation data to export");
      return;
    }
    csvExport.exportCSVAndUpload(editor.translationResult.value);
  };

  // 组件挂载时初始化
  onMounted(() => {
    storage.loadLastTranslation();
  });

  return {
    // 状态
    codeContent,
    dialogVisible,

    // 翻译结果数据
    translationResult: editor.translationResult,

    // Loading状态
    loading: translation.loading,

    // 主要操作方法
    handleTranslate,
    showLastTranslation,
    exportCSV,
    exportCSVAndUpload,

    // 编辑相关方法
    enterEditMode: editor.enterEditMode,

    // 工具方法
    hasLastTranslation: storage.hasLastTranslation,
  };
}
