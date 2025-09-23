<template>
    <el-form label-position="top" class="translation-form">
        <el-form-item :label="t('translation.enCopywriting')" prop="content">
            <div class="CodeEditor">
                <CodeEditor :modelValue="translationStore.codeContent"
                    @update:modelValue="translationStore.setCodeContent">
                </CodeEditor>
            </div>
        </el-form-item>
        <el-form-item>
            <div class="button-container">
                <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
                <el-button type="text" @click="translationStore.showLastTranslation"
                    v-if="translationStore.hasLastTranslation">
                    {{ t("translation.lastTranslation") }}
                </el-button>
                <!-- Clear按钮，固定显示 -->
                <el-button style="min-width: 90px" @click="translationStore.handleClear">
                    {{ t("common.clear") }}
                </el-button>
                <el-button v-if="!settingsStore.autoDeduplication" style="min-width: 90px" @click="handleDeduplicate">
                    {{ t("translation.deduplicate") }}
                </el-button>
                <el-button type="primary" @click="translationStore.handleTranslate" style="min-width: 90px">
                    {{ t("translation.translate") }}
                </el-button>
            </div>
        </el-form-item>
    </el-form>
</template>

<script setup>
import CodeEditor from "../Common/CodeEditor.vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import { useTranslationStore } from "../../stores/translation.js";
import { useSettingsStore } from "../../stores/settings.js";

const { t } = useI18n();

// 使用 Stores
const translationStore = useTranslationStore();
const settingsStore = useSettingsStore();

// 不再需要 props，直接使用 stores

const emit = defineEmits([
    'deduplicate'
]);

const handleDeduplicate = () => {
    emit('deduplicate');
};
</script>

<style lang="scss" scoped>
.translation-form {
    width: 100%;
}

.CodeEditor {
    width: 100%;
}

.button-container {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    align-items: center;
}

/* Last Translation 按钮样式 */
.button-container .el-button--text {
    color: #409eff;
    font-size: 14px;
    padding: 0;
    height: auto;
    line-height: 1.5;
}

.button-container .el-button--text:hover {
    color: #66b1ff;
    text-decoration: underline;
}

:deep(.el-form-item__label) {
    font-size: 16px;
    font-weight: 500;
}
</style>
