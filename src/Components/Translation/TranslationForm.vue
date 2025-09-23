<template>
    <el-form :model="formData" ref="formRef" label-position="top" class="translation-form">
        <el-form-item :label="t('translation.enCopywriting')" prop="content">
            <div class="CodeEditor">
                <CodeEditor :modelValue="codeContent" @update:modelValue="$emit('update:codeContent', $event)">
                </CodeEditor>
            </div>
        </el-form-item>
        <el-form-item>
            <div class="button-container">
                <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
                <el-button type="text" @click="showLastTranslation" v-if="hasLastTranslation">
                    {{ t("translation.lastTranslation") }}
                </el-button>
                <!-- Clear按钮，固定显示 -->
                <el-button style="min-width: 90px" @click="handleClear">
                    {{ t("common.clear") }}
                </el-button>
                <el-button v-if="!booleanStates.autoDeduplication" style="min-width: 90px" @click="handleDeduplicate">
                    {{ t("translation.deduplicate") }}
                </el-button>
                <el-button type="primary" @click="handleTranslate" style="min-width: 90px">
                    {{ t("translation.translate") }}
                </el-button>
            </div>
        </el-form-item>
    </el-form>
</template>

<script setup>
import CodeEditor from "../Common/CodeEditor.vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import { useSettings } from "../../composables/Core/useSettings.js";

const { t } = useI18n();

// 使用设置管理
const { booleanStates } = useSettings();

const props = defineProps({
    formData: {
        type: Object,
        required: true,
    },
    formRef: {
        type: Object,
        required: true,
    },
    codeContent: {
        type: String,
        required: true,
    },
    hasLastTranslation: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    'update:codeContent',
    'clear',
    'deduplicate',
    'translate',
    'showLastTranslation'
]);

const handleClear = () => {
    emit('clear');
};

const handleDeduplicate = () => {
    emit('deduplicate');
};

const handleTranslate = () => {
    emit('translate');
};

const showLastTranslation = () => {
    emit('showLastTranslation');
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
