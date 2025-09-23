<template>
  <div class="translation_group">
    <h2 class="title">{{ title }}</h2>

    <!-- 翻译表单 -->
    <TranslationForm :formData="formData" :formRef="formRef" v-model:codeContent="codeContent"
      :hasLastTranslation="hasLastTranslation" @clear="handleClear" @deduplicate="handleDeduplicate"
      @translate="handleTranslate" @showLastTranslation="showLastTranslation" />

    <!-- Excel 基线键设置 -->
    <ExcelKeySetting />

    <!-- 翻译结果对话框 -->
    <TranslationResultDialog v-model:dialogVisible="dialogVisible" :translationResult="translationResult"
      :loadingStates="loadingStates" v-model:userSuggestion="userSuggestion"
      v-model:userSuggestionVisible="userSuggestionVisible" :isTranslating="isTranslating"
      :getStatusText="getStatusText" @enterEditMode="enterEditMode" @delete="handleDelete" @exportExcel="exportExcel"
      @uploadToLokalise="uploadToLokalise" @useSuggestion="handleUseSuggestion"
      @useSuggestionCancel="handleUseSuggestionCancel" @popoverHide="handlePopoverHide" />

    <!-- 上传设置对话框 -->
    <UploadSettingsDialog v-model:uploadDialogVisible="uploadDialogVisible" v-model:uploadForm="uploadForm"
      :projectList="projectList" :isUploading="isUploading" :isUploadSuccess="isUploadSuccess"
      :successMessage="successMessage" :currentProject="currentProject" @close="handleDialogClose"
      @executeUpload="executeUpload" @projectChange="handleProjectChange" @tagChange="handleTagChange"
      @openLokaliseProject="openLokaliseProject" @openLokaliseDownload="openLokaliseDownload" />

    <!-- 去重项目选择对话框 -->
    <DeduplicateDialog v-model:deduplicateDialogVisible="deduplicateDialogVisible"
      v-model:selectedProject="selectedProject" :isDeduplicating="isDeduplicating" @close="closeDeduplicateDialog"
      @execute="executeDeduplicate" />
  </div>
</template>

<script setup>
import TranslationForm from "../Components/Translation/TranslationForm.vue";
import TranslationResultDialog from "../Components/Translation/TranslationResultDialog.vue";
import UploadSettingsDialog from "../Components/Upload/UploadSettingsDialog.vue";
import DeduplicateDialog from "../Components/Translation/DeduplicateDialog.vue";
import ExcelKeySetting from "../Components/Translation/ExcelKeySetting.vue";
import { useTranslationManager } from "../composables/useTranslationManager.js";
import { useDeduplicateDialog } from "../composables/useDeduplicateDialog.js";
import { useI18n } from "../composables/useI18n.js";
import { ElMessage } from "element-plus";

const { t } = useI18n();

// 使用翻译管理composable
const {
  codeContent,
  dialogVisible,
  formRef,
  formData,
  translationResult,
  loadingStates,
  currentStatus,
  userSuggestion,
  userSuggestionVisible,
  isTranslating,
  getStatusText,
  handleTranslate,
  continueTranslation,
  showLastTranslation,
  exportExcel,
  uploadToLokalise,
  enterEditMode,
  uploadDialogVisible,
  uploadForm,
  projectList,
  isUploading,
  isUploadSuccess,
  successMessage,
  currentProject,
  closeUploadDialog,
  executeUpload,
  handleProjectChange,
  handleTagChange,
  hasLastTranslation,
  clearCache,
  clearLastTranslation,
  saveTranslationToLocal,
} = useTranslationManager();

// 使用去重对话框composable
const {
  deduplicateDialogVisible,
  selectedProject,
  isDeduplicating,
  handleDeduplicate: handleDeduplicateDialog,
  closeDeduplicateDialog,
  executeDeduplicate: executeDeduplicateDialog,
} = useDeduplicateDialog();

// 处理去重操作
const handleDeduplicate = () => {
  // 检查是否有待翻译的文本
  if (!codeContent.value?.trim()) {
    ElMessage.warning(t("translation.noTextToDeduplicate"));
    return;
  }
  handleDeduplicateDialog();
};

// 执行去重操作
const executeDeduplicate = async () => {
  const result = await executeDeduplicateDialog(
    codeContent.value,
    continueTranslation,
    clearCache
  );

  if (result && result.success) {
    codeContent.value = result.remainingTexts;
  }
};

// 处理用户建议相关操作
const handleUseSuggestionCancel = () => {
  userSuggestion.value = "";
  userSuggestionVisible.value = false;
};

const handlePopoverHide = () => {
  userSuggestion.value = "";
  userSuggestionVisible.value = false;
};

// 删除行
const handleDelete = (row) => {
  // 从表格数据中删除指定行
  const index = translationResult.value.findIndex((item) => item === row);
  if (index > -1) {
    translationResult.value.splice(index, 1);

    // 更新本地存储
    const translationData = translationResult.value.map((item) => ({
      en: item.en,
      cn: item.cn,
      jp: item.jp,
    }));
    saveTranslationToLocal(translationData);

    // 如果删除后没有数据了，关闭对话框
    if (translationResult.value.length === 0) {
      dialogVisible.value = false;
      ElMessage.info(t("translation.allDataDeleted"));
    } else {
      ElMessage.success(t("translation.deleteSuccess"));
    }
  }
};

/**
 * 清除编辑器内容
 */
const handleClear = () => {
  codeContent.value = "";
  // 清空缓存
  clearCache();
};

/**
 * 处理弹窗关闭事件（包括点击空白处和右上角X按钮）
 */
const handleDialogClose = () => {
  // 重置所有上传相关状态
  closeUploadDialog();
};

/**
 * 打开Lokalise下载页面
 */
const openLokaliseDownload = () => {
  if (currentProject.value) {
    const downloadUrl = `https://app.lokalise.com/download/${currentProject.value.project_id}/`;
    window.open(downloadUrl, "_blank");
  }
};

/**
 * 打开Lokalise项目页面
 */
const openLokaliseProject = () => {
  if (currentProject.value) {
    const projectUrl = `https://app.lokalise.com/project/${currentProject.value.project_id}/?view=multi`;
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
