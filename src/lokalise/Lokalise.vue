<template>
  <div class="lokalise_group">
    <h2 class="title">{{ title }}</h2>

    <!-- Translation Table-->
    <TranslationForm @deduplicate="handleDeduplicate" />

    <!-- Excel Baseline Key-->
    <TranslationSetting />

    <!-- Translation Result Dialog-->
    <TranslationResultDialog />

    <!-- Upload Settings Dialog-->
    <UploadSettingsDialog />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import TranslationForm from "./components/Translation/TranslationForm.vue";
import TranslationResultDialog from "./components/Translation/TranslationResultDialog.vue";
import UploadSettingsDialog from "./components/Upload/UploadSettingsDialog.vue";
import TranslationSetting from "./components/Translation/TranslationSetting.vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import { ElMessage } from "element-plus";
import { useTranslationCoreStore } from "@/lokalise/stores/translation/core.js";
import { useDeduplicateStore } from "@/lokalise/stores/translation/deduplicate.js";
import { useUploadStore } from "@/lokalise/stores/upload.js";
import { useExportStore } from "@/lokalise/stores/translation/export.js";
import { useApiStore } from "@/lokalise/stores/settings/api.js";
import { useTranslationSettingsStore } from "@/lokalise/stores/settings/translation.js";
import { debugLog } from "@/utils/debug.js";

const { t } = useI18n();

// 使用翻译管睆store
const translationCoreStore = useTranslationCoreStore();
const deduplicateStore = useDeduplicateStore();
const uploadStore = useUploadStore();
const exportStore = useExportStore();
const apiStore = useApiStore();
const translationSettingsStore = useTranslationSettingsStore();

// 直接使用store实例，直接进行解构以保持响应式

// 处理去重操作 - 直接执行，无需对话框
const handleDeduplicate = async () => {
  // 检查是否有待翻译的文本
  if (!translationCoreStore.codeContent?.trim()) {
    ElMessage.warning(t("translation.noTextToDeduplicate"));
    return;
  }

  // 直接执行去重
  const result = await deduplicateStore.handleDeduplicate(
    translationCoreStore.codeContent,
    translationCoreStore.continueTranslation,
    translationCoreStore.handleClear,
  );

  if (result && result.success) {
    translationCoreStore.setCodeContent(result.remainingTexts);
  }
};

// 处理自动去重事件 - 直接执行，无需对话框
const handleShowAutoDeduplicateDialog = async (event) => {
  debugLog("[Lokalise] Auto deduplicate event received");
  // 从事件中获取参数，如果没有则从store中获取
  const codeContent =
    event?.detail?.codeContent || translationCoreStore.codeContent;
  const continueTranslation =
    event?.detail?.continueTranslation ||
    translationCoreStore.continueTranslation;
  const clearCache =
    event?.detail?.clearCache || translationCoreStore.handleClear;

  // 直接执行去重
  const result = await deduplicateStore.handleShowAutoDeduplicateDialog(
    codeContent,
    continueTranslation,
    clearCache,
  );

  // 如果去重成功，更新内容（自动去重已在store中更新，但这里确保手动去重也能更新）
  // 注：自动去重时，codeContent 已绝在去重store中更新，这里主要是为了手动去重的情况
  if (result && result.success) {
    // 如果 remainingTexts 是空字符串，说明所有文本都被去重了，应该清空
    // 如果 remainingTexts 有值，更新为去重后的文本
    // 自动去重时，这里会重复更新，setCodeContent 是幂等的，不会有问题
    translationCoreStore.setCodeContent(result.remainingTexts || "");
  }
};

// 组件挂载时初始化
onMounted(() => {
  debugLog("[Lokalise] Component mounted, initializing stores...");

  // 首先初始化 Translation Settings store（包括 autoDeduplication 状态）
  // 这必须在组件渲染完成，确保自动去重按钮显示正常
  translationSettingsStore.initializeTranslationSettings();
  debugLog(
    "[Lokalise] Translation Settings Store initialized. autoDeduplication:",
    translationSettingsStore.autoDeduplication,
  );

  // 确保 API store 已初始化
  apiStore.initializeApiSettings();
  debugLog(
    "[Lokalise] API Store initialized. hasLokaliseToken:",
    apiStore.hasLokaliseToken,
  );

  // 确保 Export store 已初始化（包括 Default Project）
  exportStore.initializeTranslationSettings();
  debugLog(
    "[Lokalise] Export Store initialized. defaultProjectId:",
    exportStore.defaultProjectId,
  );

  // 初始化去重设置（使用 Default Project）
  deduplicateStore.initializeDeduplicateSettings();
  debugLog(
    "[Lokalise] Deduplicate Store initialized. selectedProject:",
    deduplicateStore.selectedProject,
  );

  // 添加自动去重事件监听
  window.addEventListener(
    "showAutoDeduplicateDialog",
    handleShowAutoDeduplicateDialog,
  );
  debugLog("[Lokalise] Auto deduplicate event listener added");
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener(
    "showAutoDeduplicateDialog",
    handleShowAutoDeduplicateDialog,
  );
  debugLog("[Lokalise] Auto deduplicate event listener removed");
});

// 这些方法直接从store中获取，无需重新定义

/**
 * 处理弹窗关闭事件（包括点击空白处和右上角X按钮）
 */
const handleDialogClose = () => {
  // 重置所有上传相关状态
  uploadStore.closeUploadDialog();
};

/**
 * 打开Lokalise下载页面
 */
const openLokaliseDownload = () => {
  if (uploadStore.currentProject) {
    const downloadUrl = `https://app.lokalise.com/download/${uploadStore.currentProject.project_id}/`;
    window.open(downloadUrl, "_blank");
  }
};

/**
 * 打开Lokalise项目页面
 */
const openLokaliseProject = () => {
  if (uploadStore.currentProject) {
    const projectUrl = `https://app.lokalise.com/project/${uploadStore.currentProject.project_id}/?view=multi`;
    window.open(projectUrl, "_blank");
  }
};

defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.lokalise_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}
</style>
