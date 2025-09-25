<template>
    <el-dialog :modelValue="deduplicateDialogVisible" @update:modelValue="handleDialogVisibleChange"
        :title="t('translation.selectProject')" width="400px" top="30vh" :close-on-click-modal="!isDeduplicating"
        :close-on-press-escape="!isDeduplicating" v-loading="isDeduplicating"
        element-loading-text="Processing deduplication..." element-loading-spinner="el-icon-loading">
        <el-form label-position="top">
            <el-form-item>
                <el-select :modelValue="selectedProject" @update:modelValue="handleProjectChange" placeholder="Project"
                    style="width: 100%" :disabled="isDeduplicating">
                    <el-option label="AmazonSearch" value="AmazonSearch" />
                    <el-option label="Common" value="Common" />
                    <el-option label="Commerce" value="Commerce" />
                </el-select>
            </el-form-item>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="closeDeduplicateDialog" :disabled="isDeduplicating" style="min-width: 90px">
                    {{ t("common.cancel") }}
                </el-button>
                <el-button type="primary" style="min-width: 90px" @click="executeDeduplicate"
                    :disabled="!selectedProject || isDeduplicating" :loading="isDeduplicating">
                    {{
                        isDeduplicating
                            ? t("translation.processing")
                            : t("translation.startDeduplicate")
                    }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import { useDeduplicateStore } from "../../stores/translation/deduplicate.js";

const { t } = useI18n();
const deduplicateStore = useDeduplicateStore();

// 使用 store 中的状态，不再需要 props
const deduplicateDialogVisible = computed(() => deduplicateStore.deduplicateDialogVisible);
const selectedProject = computed(() => deduplicateStore.selectedProject);
const isDeduplicating = computed(() => deduplicateStore.isDeduplicating);

// 定义 emits，只保留必要的事件
const emit = defineEmits(['close', 'execute']);

// 处理对话框可见性变化
const handleDialogVisibleChange = (visible) => {
    if (!visible) {
        deduplicateStore.setDeduplicateDialogVisible(false);
    }
};

// 处理项目选择变化
const handleProjectChange = (project) => {
    deduplicateStore.setSelectedProject(project);
};

// 关闭对话框
const closeDeduplicateDialog = () => {
    deduplicateStore.closeDeduplicateDialog();
    emit('close');
};

// 执行去重
const executeDeduplicate = () => {
    emit('execute');
};
</script>

<style lang="scss" scoped>
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

:deep(.el-dialog__body) {
    padding: 0px;
}

:deep(.el-form-item__label) {
    font-weight: 500;
    color: #303133;
}
</style>
