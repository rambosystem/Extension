import { onMounted, onUnmounted, computed } from "vue";
import { useTranslationStore } from "../../stores/translation.js";
import { useSettingsStore } from "../../stores/settings.js";
import { useI18n } from "../Core/useI18n.js";

export function useDeduplicateDialog() {
  const { t } = useI18n();
  const translationStore = useTranslationStore();
  const settingsStore = useSettingsStore();

  // 初始化设置
  translationStore.initializeTranslationSettings();

  // 监听项目选择变化事件
  const handleProjectSelectionChange = (event) => {
    translationStore.setSelectedProject(event.detail.project);
  };

  // 处理自动去重对话框显示
  const handleShowAutoDeduplicateDialog = () => {
    translationStore.handleShowAutoDeduplicateDialog();
  };

  // 执行去重操作
  const executeDeduplicate = async (
    codeContent,
    continueTranslation,
    clearCache
  ) => {
    const result = await translationStore.executeDeduplicate(
      codeContent,
      continueTranslation,
      clearCache
    );

    // 保存项目选择到 settings store
    if (translationStore.selectedProject) {
      settingsStore.updateSetting(
        "deduplicateProject",
        translationStore.selectedProject
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
      () => translationStore.deduplicateDialogVisible
    ),
    selectedProject: computed(() => translationStore.selectedProject),
    isDeduplicating: computed(() => translationStore.isDeduplicating),
    isAutoDeduplicate: computed(() => translationStore.isAutoDeduplicate),

    // 方法（使用 store 的方法）
    handleDeduplicate: translationStore.handleDeduplicate,
    closeDeduplicateDialog: translationStore.closeDeduplicateDialog,
    executeDeduplicate,
  };
}
