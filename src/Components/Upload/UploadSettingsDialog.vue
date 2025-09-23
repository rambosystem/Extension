<template>
    <el-dialog :modelValue="translationStore.uploadDialogVisible"
        @update:modelValue="translationStore.setUploadDialogVisible"
        :title="translationStore.isUploadSuccess ? 'Upload Success' : 'Upload Setting'" width="500px" top="30vh"
        :close-on-click-modal="!translationStore.isUploading" :close-on-press-escape="!translationStore.isUploading"
        v-loading="translationStore.isUploading" element-loading-text="Uploading to Lokalise..."
        element-loading-spinner="el-icon-loading" @close="translationStore.closeUploadDialog">
        <!-- 成功页面 -->
        <div v-if="translationStore.isUploadSuccess" class="upload-success">
            <div class="success-icon">
                <img src="../../assets/success.svg" alt="Success" />
            </div>
            <div class="success-title">Success !</div>
            <div class="success-message">{{ translationStore.successMessage }}</div>
        </div>

        <!-- 上传设置表单 -->
        <el-form v-else :model="translationStore.uploadForm" label-position="top"
            @submit.prevent="translationStore.executeUpload">
            <el-form-item label="Project" required>
                <el-select :modelValue="translationStore.uploadForm.projectId"
                    @update:modelValue="translationStore.handleProjectChange" placeholder="Select a project"
                    style="width: 100%" @change="translationStore.handleProjectChange">
                    <el-option v-for="project in translationStore.projectList" :key="project.project_id"
                        :label="project.name" :value="project.project_id" />
                </el-select>
            </el-form-item>

            <el-form-item label="Tag">
                <el-input :modelValue="translationStore.uploadForm.tag"
                    @update:modelValue="translationStore.handleTagChange" placeholder="Enter tag (optional)" />
            </el-form-item>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button v-if="!translationStore.isUploadSuccess"
                    @click="translationStore.closeUploadDialog">Cancel</el-button>
                <el-button v-if="!translationStore.isUploadSuccess" type="primary"
                    @click="translationStore.executeUpload"
                    :disabled="!translationStore.uploadForm.projectId || translationStore.isUploading"
                    :loading="translationStore.isUploading">
                    {{ translationStore.isUploading ? "Uploading..." : "Upload" }}
                </el-button>
                <el-button v-if="translationStore.isUploadSuccess && translationStore.currentProject" type="primary"
                    @click="translationStore.openLokaliseProject" style="min-width: 120px">
                    View In Lokalise
                </el-button>
                <el-button v-if="translationStore.isUploadSuccess && translationStore.currentProject" type="primary"
                    @click="translationStore.openLokaliseDownload" style="min-width: 80px">
                    Build Now
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { useTranslationStore } from "../../stores/translation.js";

// 使用翻译Store
const translationStore = useTranslationStore();
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
