<template>
  <el-dialog
    :modelValue="uploadStore.uploadDialogVisible"
    @update:modelValue="uploadStore.setUploadDialogVisible"
    :title="uploadStore.isUploadSuccess ? 'Upload Success' : 'Upload Setting'"
    width="500px"
    top="30vh"
    :close-on-click-modal="!uploadStore.isUploading"
    :close-on-press-escape="!uploadStore.isUploading"
    v-loading="uploadStore.isUploading"
    element-loading-text="Uploading to Lokalise..."
    element-loading-spinner="el-icon-loading"
    @close="uploadStore.closeUploadDialog"
  >
    <!-- 成功页面 -->
    <div v-if="uploadStore.isUploadSuccess" class="upload-success">
      <div class="success-icon">
        <img src="../../assets/success.svg" alt="Success" />
      </div>
      <div class="success-title">Success !</div>
      <div class="success-message">{{ uploadStore.successMessage }}</div>
    </div>

    <!-- 上传设置表单 -->
    <el-form
      v-else
      :model="uploadStore.uploadForm"
      label-position="top"
      @submit.prevent="handleUpload"
    >
      <el-form-item label="Tag">
        <el-input
          :modelValue="uploadStore.uploadForm.tag"
          @update:modelValue="uploadStore.handleTagChange"
          placeholder="Enter tag (optional)"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          v-if="!uploadStore.isUploadSuccess"
          @click="uploadStore.closeUploadDialog"
          >Cancel</el-button
        >
        <el-button
          v-if="!uploadStore.isUploadSuccess"
          type="primary"
          @click="handleUpload"
          :disabled="uploadStore.isUploading"
          :loading="uploadStore.isUploading"
        >
          {{ uploadStore.isUploading ? "Uploading..." : "Upload" }}
        </el-button>
        <el-button
          v-if="uploadStore.isUploadSuccess && uploadStore.currentProject"
          type="primary"
          @click="uploadStore.openLokaliseProject"
          style="min-width: 120px"
        >
          View In Lokalise
        </el-button>
        <el-button
          v-if="uploadStore.isUploadSuccess && uploadStore.currentProject"
          type="primary"
          @click="uploadStore.openLokaliseDownload"
          style="min-width: 80px"
        >
          Build Now
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { useUploadStore } from "../../stores/translation/upload.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";

// 使用翻译Store
const uploadStore = useUploadStore();
const translationCoreStore = useTranslationCoreStore();

// 处理上传
const handleUpload = async () => {
  await uploadStore.executeUpload(translationCoreStore.translationResult);
};
</script>

<style lang="scss" scoped>
/* 上传设置弹窗样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 成功页面样式 */
.upload-success {
  text-align: center;
  padding: 10px 10px;

  .success-icon {
    margin-bottom: 24px;

    img {
      width: 120px;
      height: auto;
    }
  }

  .success-title {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 16px;
  }

  .success-message {
    font-size: 14px;
    color: #606266;
    line-height: 2;
    max-width: 400px;
    margin: 0 auto;
    text-align: center;
  }
}

:deep(.el-dialog__body) {
  padding: 0px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}
</style>
