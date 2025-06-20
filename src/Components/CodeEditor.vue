<template>
    <div class="code-editor-block">
        <div class="editor-container">
            <div v-for="(line, index) in lines" :key="index" class="editor-line">
                <div class="line-number">{{ index + 1 }}</div>
                <textarea :ref="el => setLineRef(el, index)" v-model="lines[index]" class="line-input"
                    :placeholder="index === 0 && !lines[0] ? '请输入代码...' : ''" spellcheck="false" autocorrect="off"
                    autocapitalize="off" translate="no" rows="1" @input="handleLineInput(index)"
                    @keydown="handleKeydown($event, index)" @paste="handlePaste($event, index)">
                </textarea>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['update:modelValue']);

const lines = ref(['']);
const lineRefs = ref({});

const setLineRef = (el, index) => {
    if (el) {
        lineRefs.value[index] = el;
    }
};

const adjustTextareaHeight = (textarea) => {
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
};

const adjustAllTextareaHeights = () => {
    nextTick(() => {
        Object.values(lineRefs.value).forEach(adjustTextareaHeight);
    });
};

onMounted(() => {
    initializeFromModelValue();
});

watch(
    () => props.modelValue,
    (newValue) => {
        const currentValue = lines.value.join('\n');
        if (newValue !== currentValue) {
            initializeFromModelValue();
        }
    }
);

const initializeFromModelValue = () => {
    lines.value = props.modelValue ? props.modelValue.split('\n') : [''];
    adjustAllTextareaHeights();
};

const updateModelValue = () => {
    const newValue = lines.value.join('\n');
    emit('update:modelValue', newValue);
};

const handleLineInput = (index) => {
    adjustTextareaHeight(lineRefs.value[index]);
    updateModelValue();
};

const handleKeydown = (event, index) => {
    const textarea = lineRefs.value[index];
    if (!textarea) return;

    const { key, shiftKey } = event;
    const { selectionStart, selectionEnd, value } = textarea;

    if (key === 'Enter' && !shiftKey) {
        event.preventDefault();

        const beforeCursor = value.slice(0, selectionStart);
        const afterCursor = value.slice(selectionEnd);

        lines.value[index] = beforeCursor;
        lines.value.splice(index + 1, 0, afterCursor);

        updateModelValue();

        nextTick(() => {
            const nextTextarea = lineRefs.value[index + 1];
            if (nextTextarea) {
                nextTextarea.focus();
                nextTextarea.setSelectionRange(0, 0);
                adjustTextareaHeight(textarea);
                adjustTextareaHeight(nextTextarea);
            }
        });
    }
    else if (key === 'Backspace' && selectionStart === 0 && selectionEnd === 0 && index > 0) {
        event.preventDefault();

        const currentLine = lines.value[index];
        const previousLine = lines.value[index - 1];
        const newCursorPosition = previousLine.length;

        lines.value[index - 1] = previousLine + currentLine;
        lines.value.splice(index, 1);

        updateModelValue();

        nextTick(() => {
            const prevTextarea = lineRefs.value[index - 1];
            if (prevTextarea) {
                prevTextarea.focus();
                prevTextarea.setSelectionRange(newCursorPosition, newCursorPosition);
                adjustTextareaHeight(prevTextarea);
            }
        });
    }
    else if (key === 'Delete' && selectionStart === value.length && selectionEnd === value.length && index < lines.value.length - 1) {
        event.preventDefault();

        const currentLine = lines.value[index];
        const nextLine = lines.value[index + 1];

        lines.value[index] = currentLine + nextLine;
        lines.value.splice(index + 1, 1);

        updateModelValue();

        nextTick(() => {
            textarea.setSelectionRange(currentLine.length, currentLine.length);
            adjustTextareaHeight(textarea);
        });
    }
    else if (key === 'Tab') {
        event.preventDefault();

        const beforeTab = value.slice(0, selectionStart);
        const afterTab = value.slice(selectionEnd);
        const newValue = beforeTab + '    ' + afterTab;
        const newCursorPosition = selectionStart + 4;

        lines.value[index] = newValue;
        updateModelValue();

        nextTick(() => {
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        });
    }
    else if (key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        lineRefs.value[index - 1]?.focus();
    }
    else if (key === 'ArrowDown' && index < lines.value.length - 1) {
        event.preventDefault();
        lineRefs.value[index + 1]?.focus();
    }
};

const handlePaste = (event, index) => {
    event.preventDefault();

    const clipboardData = event.clipboardData.getData('text');
    if (!clipboardData) return;

    const textarea = lineRefs.value[index];
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const beforePaste = value.slice(0, selectionStart);
    const afterPaste = value.slice(selectionEnd);

    const pasteLines = clipboardData.split('\n');

    if (pasteLines.length === 1) {
        lines.value[index] = beforePaste + pasteLines[0] + afterPaste;
        updateModelValue();
        nextTick(() => {
            const newCursorPosition = selectionStart + pasteLines[0].length;
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            adjustTextareaHeight(textarea);
        });
    } else {
        const firstPastedLine = pasteLines[0];
        const lastPastedLine = pasteLines[pasteLines.length - 1];
        const middlePastedLines = pasteLines.slice(1, -1);

        lines.value[index] = beforePaste + firstPastedLine;

        const newLines = middlePastedLines.concat(lastPastedLine + afterPaste);
        lines.value.splice(index + 1, 0, ...newLines);

        updateModelValue();

        nextTick(() => {
            const finalLineIndex = index + pasteLines.length - 1;
            const finalCursorPosition = lastPastedLine.length;
            const finalTextarea = lineRefs.value[finalLineIndex];

            if (finalTextarea) {
                finalTextarea.focus();
                finalTextarea.setSelectionRange(finalCursorPosition, finalCursorPosition);
            }
            adjustAllTextareaHeights();
        });
    }
};
</script>

<style scoped>
.code-editor-block {
    border: 1px solid var(--el-border-color-light);
    border-radius: var(--el-border-radius-base, 4px);
    overflow: hidden;
    font-family: 'Cascadia Code', 'Fira Code', 'Source Code Pro', 'SF Mono', Consolas,
        'Liberation Mono', Menlo, Monaco, 'Courier New', monospace;
    font-size: 14px;
    background-color: var(--el-bg-color, #ffffff);
}

.editor-container {
    display: flex;
    flex-direction: column;
    max-height: 500px;
    /* Or any height you prefer */
    overflow-y: auto;
}

.editor-line {
    display: flex;
    align-items: flex-start;
    /* Align to top for multi-line textareas */
    position: relative;
    padding: 8px 0;
    /* Vertical padding on the line itself */
    min-height: 38px;
    /* 1 line-height + 16px padding */
    box-sizing: border-box;
}

.line-number {
    flex-shrink: 0;
    width: 60px;
    padding-right: 12px;
    color: var(--el-text-color-secondary, #888888);
    text-align: right;
    user-select: none;
    font-size: 13px;
    line-height: 22px;
    /* Match textarea line-height */
    box-sizing: border-box;
}

.line-input {
    flex: 1;
    padding: 0 16px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--el-text-color-primary, #2c3e50);
    font-family: inherit;
    font-size: 14px;
    line-height: 22px;
    resize: none;
    overflow: hidden;
    /* Critical for auto-height */
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-all;
}

.line-input::placeholder {
    color: var(--el-text-color-placeholder, #bbb);
    font-style: italic;
}

/* Remove selection highlight */
.line-input::selection,
.line-input::-moz-selection {
    background-color: rgba(0, 120, 215, 0.2);
    /* Subtle default selection */
}

/* Scrollbar styles */
.editor-container::-webkit-scrollbar {
    width: 6px;
}

.editor-container::-webkit-scrollbar-track {
    background: transparent;
}

.editor-container::-webkit-scrollbar-thumb {
    background: var(--el-border-color-darker, #d0d0d0);
    border-radius: 3px;
}
</style>