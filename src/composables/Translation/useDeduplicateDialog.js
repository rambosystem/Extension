import { onMounted, onUnmounted, computed } from "vue";
import { useDeduplicateStore } from "../../stores/translation/deduplicate.js";
import { useTranslationSettingsStore } from "../../stores/settings/translation.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";

export function useDeduplicateDialog() {
  const deduplicateStore = useDeduplicateStore();
  const translationSettingsStore = useTranslationSettingsStore();
  const translationCoreStore = useTranslationCoreStore();

  // 初始化设置
  translationSettingsStore.initializeTranslationSettings();

  // 监听项目选择变化事件
  const handleProjectSelectionChange = (event) => {
    deduplicateStore.setSelectedProject(event.detail.project);
  };

  // 处理自动去重 - 直接执行，不需要对话框
  const handleShowAutoDeduplicateDialog = async (event) => {
    // 从事件中获取参数，如果没有则从 store 获取
    const codeContent =
      event?.detail?.codeContent || translationCoreStore.codeContent;
    const continueTranslation =
      event?.detail?.continueTranslation ||
      translationCoreStore.continueTranslation;
    const clearCache =
      event?.detail?.clearCache || translationCoreStore.handleClear;

    // 直接执行去重
    await deduplicateStore.handleShowAutoDeduplicateDialog(
      codeContent,
      continueTranslation,
      clearCache
    );
  };

  // 执行去重操作
  const executeDeduplicate = async (
    codeContent,
    continueTranslation,
    clearCache
  ) => {
    const result = await deduplicateStore.executeDeduplicate(
      codeContent,
      continueTranslation,
      clearCache
    );

    // 保存项目选择到 settings store
    if (deduplicateStore.selectedProject) {
      translationSettingsStore.updateSetting(
        "deduplicateProject",
        deduplicateStore.selectedProject
      );
    }

    return result;
  };

  // 组件挂载时添加事件监听
  onMounted(() => {
    window.addEventListener(
      "deduplicateProjectChanged",
      handleProjectSelectionChange
    );
    // 添加自动去重事件监听
    window.addEventListener(
      "showAutoDeduplicateDialog",
      handleShowAutoDeduplicateDialog
    );
  });

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener(
      "deduplicateProjectChanged",
      handleProjectSelectionChange
    );
    // 移除自动去重事件监听
    window.removeEventListener(
      "showAutoDeduplicateDialog",
      handleShowAutoDeduplicateDialog
    );
  });

  return {
    // 状态（使用 computed 确保响应式）
    deduplicateDialogVisible: computed(
      () => deduplicateStore.deduplicateDialogVisible
    ),
    selectedProject: computed(() => deduplicateStore.selectedProject),
    isDeduplicating: computed(() => deduplicateStore.isDeduplicating),
    isAutoDeduplicate: computed(() => deduplicateStore.isAutoDeduplicate),

    // 方法（使用 store 的方法）
    handleDeduplicate: deduplicateStore.handleDeduplicate,
    closeDeduplicateDialog: deduplicateStore.closeDeduplicateDialog,
    executeDeduplicate,
  };
}
