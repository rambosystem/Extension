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
        <el-form-item :label="t('translation.excelOverwrite')" label-position="left">
            <div class="excel-overwrite-setting">
                <el-switch v-model="Overwrite" @change="handleOverwriteChange" />
            </div>
        </el-form-item>

    </div>
</template>

<script setup>
import { useI18n } from "../../composables/Core/useI18n.js";
import { useTranslationStore } from "../../stores/translation/index.js";
import { ref, watch, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";

const { t } = useI18n();

// 使用 Translation store
const translationStore = useTranslationStore();

const excelBaselineKeyEditing = ref(false);
const isSaving = ref(false);

// 使用 computed 来获取 store 中的状态
const excelBaselineKey = computed({
    get: () => translationStore.excelBaselineKey,
    set: (value) => {
        translationStore.excelBaselineKey = value;
    }
});

// 使用 computed 来获取 Overwrite 状态
const Overwrite = computed({
    get: () => translationStore.excelOverwrite,
    set: (value) => {
        translationStore.excelOverwrite = value;
    }
});

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

    const success = translationStore.saveExcelBaselineKey(currentValue);
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
    translationStore.saveExcelBaselineKey("");
};

const handleOverwriteChange = (value) => {
    // 使用 translation store 的方法更新状态
    translationStore.updateExcelOverwrite(value);
};

// 组件挂载时初始化 store
onMounted(() => {
    translationStore.initializeTranslationSettings();
});
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
