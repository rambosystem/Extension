<template>
    <el-card style="width: 100%; cursor: pointer;" shadow='never' body-style="padding: 16px 20px; border-radius: 10px;"
        @click="handleCardClick">
        <div class="adTerms-content">
            <div class="adTerms-title-container">
                <div class="adTerms-title-text-container">
                    <span class="adTerms-title-text">{{ title }}</span>
                    <div class="adTerms-title-text-icon-container">
                        <el-icon class="adTerms-title-text-icon" @click.stop="handleSettingClick">
                            <Setting />
                        </el-icon>
                    </div>
                </div>
                <el-switch :model-value="status" @update:model-value="handleStatusChange" @click.stop width="45px" />
            </div>
            <div class="adTerms-content-text">
                <div class="total-terms-container">
                    <span class="total-terms">{{ t('terms.totalTerms') }}</span>
                    <span v-if="loading" class="total-value loading">
                        <el-icon class="is-loading"><Loading /></el-icon>
                        {{ t('common.loading') }}
                    </span>
                    <span v-else-if="error" class="total-value error">
                        {{ t('terms.loadFailed') }}
                        <el-button type="text" size="small" @click.stop="handleRefresh">
                            {{ t('common.retry') }}
                        </el-button>
                    </span>
                    <span v-else class="total-value">{{ totalTerms }}</span>
                </div>
            </div>
        </div>
    </el-card>
    <el-dialog v-model="dialogVisible" :title="t('terms.termsSettings')" width="70%">
        <el-form label-position="top">
            <el-form-item>
                <el-table 
                    :data="termsData" 
                    style="width: 100%" 
                    height="450" 
                    empty-text=""
                    v-loading="loading" 
                    :element-loading-text="t('common.loading')">
                    <el-table-column prop="en" label="EN">
                        <template #default="{ row, $index }">
                            <EditableCell 
                                :value="row.en" 
                                :isEditing="row.editing_en" 
                                @enterEdit="enterEditMode($index, 'en')"
                                @exitEdit="row.editing_en = false" 
                                @update:value="(value) => { row.en = value; handleTermsChange(); }"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column prop="cn" label="CN">
                        <template #default="{ row, $index }">
                            <EditableCell 
                                :value="row.cn" 
                                :isEditing="row.editing_cn" 
                                @enterEdit="enterEditMode($index, 'cn')"
                                @exitEdit="row.editing_cn = false" 
                                @update:value="(value) => { row.cn = value; handleTermsChange(); }"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column prop="jp" label="JP">
                        <template #default="{ row, $index }">
                            <EditableCell 
                                :value="row.jp" 
                                :isEditing="row.editing_jp" 
                                @enterEdit="enterEditMode($index, 'jp')"
                                @exitEdit="row.editing_jp = false" 
                                @update:value="(value) => { row.jp = value; handleTermsChange(); }"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column fixed="right" :label="t('common.operation')" width="120">
                        <template #default="{ row }">
                            <div class="operation-container" style="padding-left: 12px;">
                                <el-button type="text" @click.stop="handleDelete(row)">{{ t('common.delete') }}</el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </el-form-item>
            <el-form-item>
                <div class="dialog-button-container">
                    <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
                    <el-button type="primary" @click="handleSubmit" :loading="submitting">
                        {{ t('common.submit') }}
                    </el-button>
                </div>
            </el-form-item>
        </el-form>
    </el-dialog>
</template>

<script setup>
import { useI18n } from "../composables/useI18n.js";
import { Setting, Loading } from "@element-plus/icons-vue";
import { ref } from "vue";
import EditableCell from "./EditableCell.vue";

const { t } = useI18n();

const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        required: true,
    },
    totalTerms: {
        type: Number,
        required: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: null,
    },
    termsData: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['update:status', 'refresh', 'submit']);
const dialogVisible = ref(false);
const submitting = ref(false);

const handleStatusChange = (value) => {
    emit('update:status', value);
};

// 处理卡片的点击事件
const handleCardClick = (event) => {
    // 如果点击的是开关本身，不处理
    if (event.target.closest('.el-switch')) {
        return;
    }
    // 切换开关状态
    const newState = !props.status;
    emit('update:status', newState);
};

const handleSettingClick = (event) => {
    dialogVisible.value = true;
    // 打开设置对话框时自动刷新terms数据
    emit('refresh');
};

const handleSubmit = async () => {
    submitting.value = true;
    try {
        await emit('submit');
    } finally {
        submitting.value = false;
    }
};

const handleTermsChange = () => {
    // 当terms数据发生变化时触发
    // 这里可以添加额外的逻辑，比如实时检测变动状态
};

const enterEditMode = (index, field) => {
    // 进入编辑模式
    const row = props.termsData[index];
    if (row) {
        row[`editing_${field}`] = true;
    }
};
</script>

<style lang="scss" scoped>
.adTerms-title-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.adTerms-title-text-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 15px;
}

.adTerms-title-text-icon-container {
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.adTerms-title-text-icon:hover {
    color: #409eff;
}

.adTerms-title-text-icon {
    cursor: pointer;
    font-size: 16px;
    color: #909399;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.2s ease;
}



.adTerms-title-text {
    font-weight: 600;
    font-size: 16px;
    color: #303133;
    line-height: 1;
    display: flex;
    align-items: center;
}

.adTerms-content {
    width: 100%;
}

.adTerms-content-text {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    .total-terms-container {
        display: flex;
        align-items: center;

        .total-terms {
            font-size: 14px;
            color: #909399;
            margin-right: 5px;
        }

        .total-value {
            font-size: 14px;
            color: #909399;
            
            &.loading {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #409eff;
            }
            
            &.error {
                color: #f56c6c;
                display: flex;
                align-items: center;
                gap: 5px;
            }
        }
    }
}

.setting-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.dialog-button-container {
    margin-top: 20px;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0px;
}

.terms-cell {
    padding: 0 12px;
    line-height: 50px;
    display: block;
    color: #303133;
}

/* 对话框表单样式 */
:deep(.el-dialog .el-form) {
    margin: 0;
}

:deep(.el-dialog .el-form-item) {
    margin-bottom: 20px;
}

:deep(.el-dialog .el-form-item:last-child) {
    margin-bottom: 0;
    padding-bottom: 0;
}

:deep(.el-dialog .el-form-item__label) {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 8px;
}

/* 加粗对话框标题 */
:deep(.el-dialog__title) {
    font-weight: 600;
    font-size: 18px;
    color: #303133;
}

/* 设置对话框内边距 */
:deep(.el-dialog) {
    --el-dialog-padding-primary: 20px;
}

/* 表格样式优化 */
:deep(.el-table) {
    border: none;
}

:deep(.el-table__border-top-patch) {
    display: none;
}

:deep(.el-table__border-right-patch) {
    display: none;
}

:deep(.el-table td) {
    border: none;
    border-bottom: 1px solid #f0f0f0;
    padding: 0;
    height: 50px;
}

:deep(.el-table th) {
    border: none;
    height: 50px;
    padding-left: 12px;
}

:deep(.el-table__row) {
    height: 50px;
}

:deep(.el-table__row:last-child td) {
    border-bottom: none;
}

:deep(.el-table__cell) {
    border: none;
    padding: 0;
}

:deep(.el-table--border) {
    border: none;
}

:deep(.el-table--border::after) {
    display: none;
}

:deep(.el-table--border::before) {
    display: none;
}
</style>