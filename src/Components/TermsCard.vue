<template>
    <el-card style="width: 100%; cursor: pointer;" shadow='never' body-style="padding: 16px 20px; border-radius: 10px;"
        @click="handleCardClick">
        <div class="adTerms-content">
            <div class="adTerms-title-container">
                <div class="adTerms-title-text-container">
                    <span class="adTerms-title-text">{{ item.title }}</span>
                    <div class="adTerms-title-text-icon-container">
                        <el-icon class="adTerms-title-text-icon" @click.stop="handleSettingClick">
                            <Setting />
                        </el-icon>
                    </div>
                </div>
                <el-switch :model-value="item.status" @update:model-value="handleStatusChange" @click.stop
                    width="45px" />
            </div>
            <div class="adTerms-content-text">
                <div class="total-terms-container">
                    <span class="total-terms">{{ t('terms.totalTerms') }}</span>
                    <span class="total-value">{{ item.translations.length }}</span>
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
import { Setting } from "@element-plus/icons-vue";
import { ref } from "vue";

const { t } = useI18n();

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['update:status']);
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
    const newState = !props.item.status;
    emit('update:status', newState);
};

const handleSettingClick = (event) => {
    dialogVisible.value = true;
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