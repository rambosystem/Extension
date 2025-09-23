<template>
    <div>
        <h2 class="title">{{ t("translation.exportSetting") }}</h2>
        <el-form-item :label="t('translation.excelKeySetting')" label-position="left">
            <div class="excel-key-setting">
                <div class="input-container">
                    <el-input v-model="excelBaselineKey" :placeholder="t('translation.excelKeySettingPlaceholder')"
                        @blur="handleExcelBaselineKeyCancel" @focus="handleExcelBaselineKeyFocus" />
                </div>
            </div>
        </el-form-item>
        <el-form-item v-show="excelBaselineKeyEditing">
            <div class="excel-key-setting-button-container">
                <el-button @click="handleExcelBaselineKeyClear" style="min-width: 90px">{{ t("common.clear")
                }}</el-button>
                <el-button type="primary" @click="handleExcelBaselineKeySave" style="min-width: 90px">{{
                    t("common.save") }}</el-button>
            </div>
        </el-form-item>
    </div>
</template>

<script setup>
import { useI18n } from "../composables/useI18n.js";
import { useSettings } from "../composables/useSettings.js";
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";

const { t } = useI18n();

// 使用设置管理
const { excelBaselineKey, handleSaveExcelBaselineKey } = useSettings();

const excelBaselineKeyEditing = ref(false);
const isSaving = ref(false);

//excelBaselineKey变动时，设置excelBaselineKeyEditing为true，空值时设置为false
watch(
    () => excelBaselineKey.value,
    (newValue) => {
        // 有值时显示按钮，空值时隐藏按钮
        if (newValue && newValue.trim()) {
            excelBaselineKeyEditing.value = true;
        } else {
            excelBaselineKeyEditing.value = false;
        }
    }
);

const handleExcelBaselineKeySave = () => {
    if (!excelBaselineKeyEditing.value) return;

    const currentValue = excelBaselineKey.value || "";

    // 检查是否为空
    if (!currentValue.trim()) {
        ElMessage.warning(t("translation.excelBaselineKeySaveWarning"));
        return;
    }

    isSaving.value = true;

    const success = handleSaveExcelBaselineKey(currentValue);
    if (success) {
        excelBaselineKeyEditing.value = false;
    }

    isSaving.value = false;
};

const handleExcelBaselineKeyFocus = () => {
    excelBaselineKeyEditing.value = true;
};

const handleExcelBaselineKeyCancel = () => {
    // 如果正在保存，不处理失焦
    if (isSaving.value) return;

    // 延迟处理，给用户时间点击保存按钮
    setTimeout(() => {
        if (excelBaselineKeyEditing.value && !isSaving.value) {
            // 失焦时清空值并隐藏按钮
            excelBaselineKey.value = "";
            excelBaselineKeyEditing.value = false;
        }
    }, 200);
};

const handleExcelBaselineKeyClear = () => {
    excelBaselineKey.value = "";
    excelBaselineKeyEditing.value = false;
    // 清空存储
    handleSaveExcelBaselineKey("");
};
</script>

<style lang="scss" scoped>
.title {
    font-size: 24px;
    margin-bottom: 20px;
}

.excel-key-setting {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    width: 100%;

    .input-container {
        width: 200px;
    }
}

.excel-key-setting-button-container {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    width: 100%;
    gap: 8px;
}

:deep(.el-form-item__label) {
    font-size: 16px;
    font-weight: 500;
}
</style>
