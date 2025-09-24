import { ref, onMounted, onUnmounted } from "vue";
import { useSettingsStore } from "../../stores/settings.js";
import { useDeduplicate } from "./useDeduplicate.js";
import { ElMessage } from "element-plus";
import { useI18n } from "../Core/useI18n.js";

export function useDeduplicateDialog() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const { deduplicateTranslation } = useDeduplicate();

  // 去重相关状态
  const deduplicateDialogVisible = ref(false);
  const selectedProject = ref(settingsStore.deduplicateProject);
  const isDeduplicating = ref(false);
  const isAutoDeduplicate = ref(false); // 标记是否为自动去重

  const handleDeduplicate = () => {
    // 设置为手动去重
    isAutoDeduplicate.value = false;
    // 打开项目选择弹窗
    deduplicateDialogVisible.value = true;
  };

  // 关闭去重弹窗
  const closeDeduplicateDialog = () => {
    deduplicateDialogVisible.value = false;
    isDeduplicating.value = false;
    isAutoDeduplicate.value = false; // 重置自动去重标志
    // 保存项目选择
    if (selectedProject.value) {
      settingsStore.updateSetting("deduplicateProject", selectedProject.value);
    }
  };

  // 执行去重操作
  const executeDeduplicate = async (
    codeContent,
    continueTranslation,
    clearCache
  ) => {
    if (!selectedProject.value) {
      ElMessage.warning(t("translation.pleaseSelectProject"));
      return;
    }

    isDeduplicating.value = true;

    try {
      const result = await deduplicateTranslation(
        selectedProject.value,
        codeContent
      );

      // 无论是否有剩余文本，都要更新文本框内容
      const remainingTexts = result.remainingTexts.join("\n");

      if (result.remainingCount > 0) {
        ElMessage.success(
          t("translation.deduplicateSuccess", {
            duplicate: result.duplicateCount,
            remaining: result.remainingCount,
          })
        );

        // 如果是自动去重，继续翻译流程
        if (isAutoDeduplicate.value) {
          // 关闭去重对话框
          deduplicateDialogVisible.value = false;
          // 继续翻译
          if (continueTranslation) {
            await continueTranslation();
          }
        }

        // 保存项目选择
        settingsStore.updateSetting(
          "deduplicateProject",
          selectedProject.value
        );

        return { success: true, remainingTexts };
      } else {
        // 如果所有文本都被去重了，清空缓存
        if (clearCache) {
          clearCache();
        }
        ElMessage.info(t("translation.allTextsDuplicated"));

        // 如果是自动去重，关闭对话框
        if (isAutoDeduplicate.value) {
          deduplicateDialogVisible.value = false;
        }

        // 保存项目选择
        settingsStore.updateSetting(
          "deduplicateProject",
          selectedProject.value
        );

        return { success: true, remainingTexts: "" };
      }
    } catch (error) {
      console.error("Deduplication failed:", error);
      ElMessage.error(t("translation.deduplicateFailed"));
      return { success: false, error };
    } finally {
      isDeduplicating.value = false;
    }
  };

  // 监听项目选择变化事件
  const handleProjectSelectionChange = (event) => {
    selectedProject.value = event.detail.project;
  };

  // 处理自动去重对话框显示
  const handleShowAutoDeduplicateDialog = () => {
    // 设置为自动去重
    isAutoDeduplicate.value = true;
    // 打开项目选择弹窗
    deduplicateDialogVisible.value = true;
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
    deduplicateDialogVisible,
    selectedProject,
    isDeduplicating,
    isAutoDeduplicate,
    handleDeduplicate,
    closeDeduplicateDialog,
    executeDeduplicate,
  };
}
