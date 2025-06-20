<template>
    <div class="code-editor-block">
        <div class="editor-gutters">
            <div v-for="lineNum in lineNumbers" :key="lineNum" class="gutter-line-number">
                {{ lineNum }}
            </div>
        </div>
        <div ref="contentEditableRef" class="editor-content" contenteditable="true" spellcheck="false" autocorrect="off"
            autocapitalize="off" translate="no" @input="handleInput" @scroll="handleScroll" @keydown="handleKeydown"
            @paste="handlePaste">
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['update:modelValue']);

const contentEditableRef = ref(null);
const lineCount = ref(1);

const lineNumbers = computed(() =>
    Array.from({ length: lineCount.value }, (_, i) => i + 1)
);

onMounted(() => {
    if (contentEditableRef.value) {
        contentEditableRef.value.innerText = props.modelValue || '';
        nextTick(updateLineCount);
    }
});

watch(
    () => props.modelValue,
    (newValue) => {
        if (contentEditableRef.value && newValue !== contentEditableRef.value.innerText) {
            contentEditableRef.value.innerText = newValue;
            nextTick(updateLineCount);
        }
    }
);

const handleInput = () => {
    if (contentEditableRef.value) {
        const newValue = contentEditableRef.value.innerText || '';
        emit('update:modelValue', newValue);
        setTimeout(updateLineCount, 0);
    }
};

const updateLineCount = () => {
    if (contentEditableRef.value) {
        const element = contentEditableRef.value;
        const text = element.innerText || '';

        if (!text) {
            lineCount.value = 1;
        } else {
            const lines = text.split('\n');
            let actualLineCount = lines.length;

            // 移除 contentEditable 产生的多余空行
            while (actualLineCount > 1 &&
                lines[actualLineCount - 1] === '' &&
                lines[actualLineCount - 2] === '') {
                actualLineCount--;
            }

            lineCount.value = actualLineCount;
        }

        nextTick(syncScrollHeight);
    }
};

const handleScroll = () => {
    if (contentEditableRef.value) {
        const gutters = contentEditableRef.value.previousElementSibling;
        if (gutters) {
            gutters.scrollTop = contentEditableRef.value.scrollTop;
        }
    }
};

const syncScrollHeight = () => {
    if (contentEditableRef.value) {
        const gutters = contentEditableRef.value.previousElementSibling;
        if (gutters) {
            gutters.style.minHeight = `${contentEditableRef.value.scrollHeight}px`;
        }
    }
};

const handleKeydown = (event) => {
    if (event.key === 'Tab') {
        event.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const tabNode = document.createTextNode('    ');
        range.insertNode(tabNode);
        range.setStartAfter(tabNode);
        range.setEndAfter(tabNode);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
    }
};

const handlePaste = () => {
    setTimeout(handleInput, 10);
};
</script>

<style scoped>
.code-editor-block {
    display: flex;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    overflow: hidden;
    font-family: 'Cascadia Code', 'Fira Code', 'Source Code Pro', Consolas, Monaco,
        'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
    background-color: var(--el-fill-color-extra-light);
    min-height: 120px;
}

.editor-gutters {
    flex-shrink: 0;
    padding: 8px 12px;
    background-color: var(--el-fill-color-darker);
    color: var(--el-text-color-placeholder);
    text-align: right;
    user-select: none;
    overflow: hidden;
    border-right: 1px solid var(--el-border-color-dark);
    box-sizing: border-box;
}

.gutter-line-number {
    height: 21px;
    line-height: 21px;
    font-size: 14px;
}

.editor-content {
    flex-grow: 1;
    padding: 8px 12px;
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: auto;
    color: var(--el-text-color-regular);
    caret-color: #000000;
    font-size: 14px;
    line-height: 21px;
}
</style>