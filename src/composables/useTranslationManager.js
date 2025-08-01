import { ref, reactive, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useTranslation } from "./useTranslation.js";
import { useCSVExport } from "./useCSVExport.js";
import { useTranslationStorage } from "./useTranslationStorage.js";
import { useTranslationCache } from "./useTranslationCache.js";
import { useTableEditor } from "./useTableEditor.js";
import { useI18n } from "./useI18n.js";

const { t } = useI18n();

/**
 * 翻译管理主Hook - 整合所有翻译相关功能
 */
export function useTranslationManager() {
  // 基础状态
  const codeContent = ref("");
  const dialogVisible = ref(false);
  const formRef = ref();
  const formData = reactive({});

  // 使用各个功能模块
  const translation = useTranslation();
  const csvExport = useCSVExport();
  const storage = useTranslationStorage();
  const cache = useTranslationCache();
  const editor = useTableEditor();

  // 监听输入内容变化，自动保存到缓存
  watch(codeContent, (newValue) => {
    if (newValue?.trim()) {
      cache.saveToCache(newValue);
    }
  }, { debounce: 1000 }); // 防抖1秒，减少频繁保存

  /**
   * 从缓存恢复待翻译文本（静默加载）
   */
  const restoreFromCache = () => {
    const cachedText = cache.getCachedText();
    // 只有在输入框为空且有缓存内容时才恢复
    if (cachedText && !codeContent.value?.trim()) {
      codeContent.value = cachedText;
      console.log("Silently restored text from cache:", cachedText.substring(0, 50) + "...");
    }
  };

  /**
   * 清空缓存
   */
  const clearCache = () => {
    cache.clearCache();
    console.log("Cache cleared by user action");
  };

  /**
   * 执行翻译并处理结果
   */
  const handleTranslate = async () => {
    // ===== 错误检查阶段 =====
    
    // 1. 检查 API Key 是否存在（优先检查）
    const apiKey = localStorage.getItem("deepseek_api_key");
    if (!apiKey) {
      ElMessage.warning(t("translation.pleaseConfigureAPIKey"));
      return;
    }

    // 2. 检查输入内容是否为空
    if (!codeContent.value?.trim()) {
      ElMessage.warning(t("translation.pleaseEnterContent"));
      return;
    }

    // ===== 正常流程阶段 =====
    
    try {
      // 先弹出对话框，显示加载状态
      dialogVisible.value = true;
      
      // 执行翻译
      const result = await translation.performTranslation(codeContent.value);

      // 设置表格数据
      editor.setTranslationResult(result);

      // 提取纯数据并保存到存储
      const translationData = translation.extractTranslationData(result);
      storage.saveTranslationToLocal(translationData);
      
    } catch (error) {
      // 翻译失败时关闭对话框
      dialogVisible.value = false;
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
      ElMessage.warning(t("translation.noPreviousTranslation"));
    }
  };

  /**
   * 导出CSV文件
   */
  const exportCSV = () => {
    if (editor.isEmpty()) {
      ElMessage.warning(t("translation.noTranslationData"));
      return;
    }
    csvExport.exportCSV(editor.translationResult.value);
  };

  /**
   * 导出CSV并上传到Lokalise
   */
  const exportCSVAndUpload = () => {
    if (editor.isEmpty()) {
      ElMessage.warning(t("translation.noTranslationData"));
      return;
    }
    csvExport.exportCSVAndUpload(editor.translationResult.value);
  };

  // 组件挂载时初始化
  onMounted(() => {
    storage.loadLastTranslation();
    // 尝试从缓存恢复待翻译文本
    restoreFromCache();
  });

  return {
    // 状态
    codeContent,
    dialogVisible,
    formRef,
    formData,

    // 翻译结果数据
    translationResult: editor.translationResult,

    // Loading状态
    loadingStates: translation.loadingStates,
    
    // 动态状态
    currentStatus: translation.currentStatus,
    getStatusText: translation.getStatusText,

    // 主要操作方法
    handleTranslate,
    showLastTranslation,
    exportCSV,
    exportCSVAndUpload,

    // 编辑相关方法
    enterEditMode: editor.enterEditMode,

    // 缓存相关方法（静默）
    restoreFromCache,
    clearCache,

    // 工具方法
    hasLastTranslation: storage.hasLastTranslation,
  };
}
