<template>
  <el-dialog :modelValue="uploadStore.uploadDialogVisible" @update:modelValue="uploadStore.setUploadDialogVisible"
    :title="uploadStore.isUploadSuccess ? 'Upload Success' : 'Upload Setting'" width="500px" top="30vh"
    :close-on-click-modal="!uploadStore.isUploading" :close-on-press-escape="!uploadStore.isUploading"
    v-loading="uploadStore.isUploading" element-loading-text="Uploading to Lokalise..."
    element-loading-spinner="el-icon-loading" @close="uploadStore.closeUploadDialog">
    <!-- 成功页面 -->
    <div v-if="uploadStore.isUploadSuccess" class="upload-success">
      <div class="success-icon">
        <img src="../../assets/success.svg" alt="Success" />
      </div>
      <div class="success-title">Success !</div>
      <div class="success-message">{{ uploadStore.successMessage }}</div>
    </div>

    <!-- 上传设置表单 -->
    <el-form v-else :model="uploadStore.uploadForm" label-position="top" @submit.prevent="handleUpload">
      <el-form-item label="Tag">
        <el-select :model-value="uploadStore.uploadForm.tag" @update:model-value="uploadStore.handleTagChange"
          filterable remote :remote-method="remoteSearchTags" :loading="tagSearchLoading"
          placeholder="Search or enter tag" allow-create default-first-option clearable style="width: 100%">
          <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="!uploadStore.isUploadSuccess" @click="uploadStore.closeUploadDialog">Cancel</el-button>
        <el-button v-if="!uploadStore.isUploadSuccess" type="primary" @click="handleUpload"
          :disabled="uploadStore.isUploading" :loading="uploadStore.isUploading">
          {{ uploadStore.isUploading ? "Uploading..." : "Upload" }}
        </el-button>
        <el-button v-if="uploadStore.isUploadSuccess && uploadStore.currentProject" type="primary"
          @click="uploadStore.openLokaliseProject" style="min-width: 120px">
          View In Lokalise
        </el-button>
        <el-button v-if="uploadStore.isUploadSuccess && uploadStore.currentProject" type="primary"
          @click="uploadStore.openLokaliseDownload" style="min-width: 80px">
          Build Now
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { useUploadStore } from "../../stores/translation/upload.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";
import { autocompleteTags } from "../../requests/autocomplete.js";
import { debugLog, debugError } from "../../utils/debug.js";
import { ref, watch } from "vue";

// 使用翻译Store
const uploadStore = useUploadStore();
const translationCoreStore = useTranslationCoreStore();

// Tag选项列表
const tagOptions = ref([]);
// Tag搜索加载状态
const tagSearchLoading = ref(false);

/**
 * 获取项目ID（用于tag搜索）
 */
const getProjectId = () => {
  return uploadStore.uploadForm.projectId || null;
};

/**
 * 远程搜索Tag（用于el-select的remote-method）
 * 只在用户手动输入时才进行搜索匹配
 * @param {string} query - 搜索关键词
 */
const remoteSearchTags = async (query) => {
  const projectId = getProjectId();
  if (!projectId) {
    tagOptions.value = [];
    return;
  }

  // 如果查询为空，不进行搜索（等待用户输入）
  if (!query || !query.trim()) {
    tagOptions.value = [];
    return;
  }

  try {
    tagSearchLoading.value = true;
    debugLog("[Tag Remote Search] Calling API with:", {
      projectId,
      query: query.trim(),
      limit: 20,
    });

    const response = await autocompleteTags(projectId, query.trim(), 20);

    debugLog("[Tag Remote Search] API response:", response);

    // 验证响应格式
    if (response && response.success && response.results) {
      tagOptions.value = response.results.map((item) => item.tag).filter(Boolean);
      debugLog("[Tag Remote Search] Found tags:", tagOptions.value);
    } else {
      tagOptions.value = [];
      debugLog("[Tag Remote Search] No tags found");
    }
  } catch (error) {
    debugError("[Tag Remote Search] Error occurred:", error);
    tagOptions.value = [];
  } finally {
    tagSearchLoading.value = false;
  }
};

// 监听对话框打开，加载已保存的tag
watch(
  () => uploadStore.uploadDialogVisible,
  (isVisible) => {
    if (isVisible) {
      // 对话框打开时，加载已保存的tag（如果之前有保存）
      try {
        const savedTag = localStorage.getItem("lokalise_upload_tag");
        if (savedTag && savedTag.trim()) {
          debugLog("[Tag Load] Loading saved tag:", savedTag);
          uploadStore.setUploadTag(savedTag);
        } else {
          debugLog("[Tag Load] No saved tag, user needs to input manually");
        }
      } catch (error) {
        debugError("[Tag Load] Failed to load saved tag:", error);
      }
    } else {
      // 对话框关闭时清空选项
      tagOptions.value = [];
    }
  }
);

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
