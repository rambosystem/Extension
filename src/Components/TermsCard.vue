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
    <el-dialog v-model="dialogVisible" title="设置" width="500px">
        <div class="setting-content">
            <div class="setting-item">
                <span class="setting-item-text">设置</span>
            </div>
        </div>
    </el-dialog>
</template>

<script setup>
import { useI18n } from "../composables/useI18n.js";
import { Setting, Loading } from "@element-plus/icons-vue";
import { ref } from "vue";

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
});

const emit = defineEmits(['update:status', 'refresh']);
const dialogVisible = ref(false);

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
};

const handleRefresh = () => {
    emit('refresh');
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
</style>