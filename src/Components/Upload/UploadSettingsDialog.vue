<template>
    <el-dialog :modelValue="uploadDialogVisible" @update:modelValue="$emit('update:uploadDialogVisible', $event)"
        :title="isUploadSuccess ? 'Upload Success' : 'Upload Setting'" width="500px" top="30vh"
        :close-on-click-modal="!isUploading" :close-on-press-escape="!isUploading" v-loading="isUploading"
        element-loading-text="Uploading to Lokalise..." element-loading-spinner="el-icon-loading"
        @close="handleDialogClose">
        <!-- 成功页面 -->
        <div v-if="isUploadSuccess" class="upload-success">
            <div class="success-icon">
                <img src="../../assets/success.svg" alt="Success" />
            </div>
            <div class="success-title">Success !</div>
            <div class="success-message">{{ successMessage }}</div>
        </div>

        <!-- 上传设置表单 -->
        <el-form v-else :model="uploadForm" label-position="top" @submit.prevent="executeUpload">
            <el-form-item label="Project" required>
                <el-select :modelValue="uploadForm.projectId" @update:modelValue="handleProjectChange"
                    placeholder="Select a project" style="width: 100%" @change="handleProjectChange">
                    <el-option v-for="project in projectList" :key="project.project_id" :label="project.name"
                        :value="project.project_id" />
                </el-select>
            </el-form-item>

            <el-form-item label="Tag">
                <el-input :modelValue="uploadForm.tag" @update:modelValue="handleTagChange"
                    placeholder="Enter tag (optional)" />
            </el-form-item>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button v-if="!isUploadSuccess" @click="closeUploadDialog">Cancel</el-button>
                <el-button v-if="!isUploadSuccess" type="primary" @click="executeUpload"
                    :disabled="!uploadForm.projectId || isUploading" :loading="isUploading">
                    {{ isUploading ? "Uploading..." : "Upload" }}
                </el-button>
                <el-button v-if="isUploadSuccess && currentProject" type="primary" @click="openLokaliseProject"
                    style="min-width: 120px">
                    View In Lokalise
                </el-button>
                <el-button v-if="isUploadSuccess && currentProject" type="primary" @click="openLokaliseDownload"
                    style="min-width: 80px">
                    Build Now
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
const props = defineProps({
    uploadDialogVisible: {
        type: Boolean,
        required: true,
    },
    uploadForm: {
        type: Object,
        required: true,
    },
    projectList: {
        type: Array,
        required: true,
    },
    isUploading: {
        type: Boolean,
        default: false,
    },
    isUploadSuccess: {
        type: Boolean,
        default: false,
    },
    successMessage: {
        type: String,
        default: "",
    },
    currentProject: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits([
    'update:uploadDialogVisible',
    'update:uploadForm',
    'close',
    'executeUpload',
    'projectChange',
    'tagChange',
    'openLokaliseProject',
    'openLokaliseDownload'
]);

const handleDialogClose = () => {
    emit('close');
};

const closeUploadDialog = () => {
    emit('update:uploadDialogVisible', false);
};

const executeUpload = () => {
    emit('executeUpload');
};

const handleProjectChange = (value) => {
    emit('projectChange', value);
};

const handleTagChange = (value) => {
    emit('tagChange', value);
};

const openLokaliseProject = () => {
    emit('openLokaliseProject');
};

const openLokaliseDownload = () => {
    emit('openLokaliseDownload');
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
