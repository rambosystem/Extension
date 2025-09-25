<template>
  <div class="translation_group">
    <h2 class="title">{{ title }}</h2>

    <!-- 翻译表单 -->
    <TranslationForm @deduplicate="handleDeduplicate" />

    <!-- Excel 基线键设置 -->
    <ExportSetting />

    <!-- 翻译结果对话框 -->
    <TranslationResultDialog />

    <!-- 上传设置对话框 -->
    <UploadSettingsDialog />

    <!-- 去重项目选择对话框 -->
    <DeduplicateDialog @close="closeDeduplicateDialog" @execute="executeDeduplicate" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import TranslationForm from "../Components/Translation/TranslationForm.vue";
import TranslationResultDialog from "../Components/Translation/TranslationResultDialog.vue";
import UploadSettingsDialog from "../Components/Upload/UploadSettingsDialog.vue";
import DeduplicateDialog from "../Components/Translation/DeduplicateDialog.vue";
import ExportSetting from "../Components/Translation/ExportSetting.vue";
import { useDeduplicateDialog } from "../composables/Translation/useDeduplicateDialog.js";
import { useI18n } from "../composables/Core/useI18n.js";
import { ElMessage } from "element-plus";
import { useTranslationCoreStore } from "../stores/translation/core.js";
import { useDeduplicateStore } from "../stores/translation/deduplicate.js";
import { useUploadStore } from "../stores/translation/upload.js";

const { t } = useI18n();

// 使用翻译管理store
const translationCoreStore = useTranslationCoreStore();
const deduplicateStore = useDeduplicateStore();
const uploadStore = useUploadStore();

// 直接使用store实例，不进行解构以保持响应式

// 使用去重对话框composable
const {
  handleDeduplicate: handleDeduplicateDialog,
  closeDeduplicateDialog,
  executeDeduplicate: executeDeduplicateDialog,
} = useDeduplicateDialog();

// 处理去重操作
const handleDeduplicate = () => {
  // 检查是否有待翻译的文本
  if (!translationCoreStore.codeContent?.trim()) {
    ElMessage.warning(t("translation.noTextToDeduplicate"));
    return;
  }
  handleDeduplicateDialog();
};

// 执行去重操作
const executeDeduplicate = async () => {
  const result = await executeDeduplicateDialog(
    translationCoreStore.codeContent,
    translationCoreStore.continueTranslation,
    translationCoreStore.handleClear
  );

  if (result && result.success) {
    translationCoreStore.setCodeContent(result.remainingTexts);
  }
};

// 这些方法直接从store中获取，不需要重新定义

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

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.translation_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}
</style>
