<template>
    <el-dialog :modelValue="deduplicateDialogVisible"
        @update:modelValue="$emit('update:deduplicateDialogVisible', $event)" :title="t('translation.selectProject')"
        width="400px" top="30vh" :close-on-click-modal="!isDeduplicating" :close-on-press-escape="!isDeduplicating"
        v-loading="isDeduplicating" element-loading-text="Processing deduplication..."
        element-loading-spinner="el-icon-loading">
        <el-form label-position="top">
            <el-form-item>
                <el-select :modelValue="selectedProject" @update:modelValue="$emit('update:selectedProject', $event)"
                    placeholder="Project" style="width: 100%" :disabled="isDeduplicating">
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
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();

const props = defineProps({
    deduplicateDialogVisible: {
        type: Boolean,
        required: true,
    },
    selectedProject: {
        type: String,
        required: true,
    },
    isDeduplicating: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    'update:deduplicateDialogVisible',
    'update:selectedProject',
    'close',
    'execute'
]);

const closeDeduplicateDialog = () => {
    emit('close');
};

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
