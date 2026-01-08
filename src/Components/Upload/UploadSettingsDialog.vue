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
        <AutocompleteInput :modelValue="uploadStore.uploadForm.tag" @update:modelValue="uploadStore.handleTagChange"
          placeholder="Enter tag (optional)" :fetch-suggestions="fetchTagSuggestions" :get-project-id="getProjectId"
          :show-dropdown="true" :dropdown-limit="10" :fetch-suggestions-list="fetchTagSuggestionsList" />
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
import AutocompleteInput from "../Common/AutocompleteInput.vue";
import { autocompleteTags } from "../../requests/autocomplete.js";
import { debugLog, debugError } from "../../utils/debug.js";

// 使用翻译Store
const uploadStore = useUploadStore();
const translationCoreStore = useTranslationCoreStore();

/**
 * 获取项目ID（用于tag自动补全）
 */
const getProjectId = () => {
  return uploadStore.uploadForm.projectId || null;
};

/**
 * 获取Tag自动补全建议
 * 使用第一个匹配结果（已按优先级排序：前缀匹配 > 包含匹配，最近使用优先）
 * @param {string} queryString - 搜索关键词
 * @param {string} projectId - 项目ID
 * @returns {Promise<string|null>} 建议的tag名称
 */
const fetchTagSuggestions = async (queryString, projectId) => {
  try {
    debugLog("[Tag Autocomplete] Calling API with:", {
      projectId,
      query: queryString.trim(),
      limit: 1,
    });

    const response = await autocompleteTags(projectId, queryString.trim(), 1);

    debugLog("[Tag Autocomplete] API response:", response);

    // 验证响应格式
    if (!response || !response.success) {
      debugLog(
        "[Tag Autocomplete] Invalid response or unsuccessful:",
        response
      );
      return null;
    }

    // 获取第一条建议（已按优先级排序，使用第一个即可）
    const firstResult = response?.results?.[0];
    if (firstResult && firstResult.tag) {
      debugLog("[Tag Autocomplete] Found suggestion:", firstResult.tag);
      return firstResult.tag;
    }

    debugLog("[Tag Autocomplete] No suggestions found");
    return null;
  } catch (error) {
    debugError("[Tag Autocomplete] Error occurred:", error);
    return null;
  }
};

/**
 * 获取Tag建议列表（用于下拉菜单）
 * @param {string} queryString - 搜索关键词
 * @param {string} projectId - 项目ID
 * @param {number} limit - 返回结果数量限制
 * @returns {Promise<Array<string>>} 建议的tag名称列表
 */
const fetchTagSuggestionsList = async (queryString, projectId, limit = 10) => {
  try {
    debugLog("[Tag Dropdown] Calling API with:", {
      projectId,
      query: queryString.trim(),
      limit,
    });

    const response = await autocompleteTags(projectId, queryString.trim(), limit);

    debugLog("[Tag Dropdown] API response:", response);

    // 验证响应格式
    if (!response || !response.success) {
      debugLog("[Tag Dropdown] Invalid response or unsuccessful:", response);
      return [];
    }

    // 返回所有结果的tag名称列表
    if (response?.results && Array.isArray(response.results)) {
      const suggestions = response.results
        .map((result) => result.tag)
        .filter((tag) => tag); // 过滤掉空值
      debugLog("[Tag Dropdown] Suggestions:", suggestions);
      return suggestions;
    }
    return [];
  } catch (error) {
    debugError("[Tag Dropdown] Error occurred:", error);
    return [];
  }
};

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
