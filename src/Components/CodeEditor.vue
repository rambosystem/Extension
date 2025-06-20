<template>
    <!-- CodeMirror 会把内部结构注入到此元素 -->
    <div ref="host" class="cm-editor" style="height: 300px;"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const host = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

onMounted(() => {
    view = new EditorView({
        parent: host.value!,
        state: EditorState.create({
            doc: props.modelValue ?? '',
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                keymap.of(defaultKeymap),
                javascript(),
                EditorView.updateListener.of(u => {
                    if (u.docChanged)
                        emit('update:modelValue', u.state.doc.toString());
                })
            ]
        })
    });
});

watch(() => props.modelValue, v => {
    if (view && v !== view.state.doc.toString())
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
});

onUnmounted(() => view?.destroy());
</script>

<style scoped>
/* CodeMirror 编辑器主容器样式 */
.cm-editor {
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    overflow: hidden;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    background-color: #f8f9fa;
    max-height: 500px;
}

/* 滚动容器 */
.cm-scroller {
    background-color: #f8f9fa;
    max-height: 500px;
    overflow-x: auto;
    overflow-y: auto;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 内容区域 */
.cm-content {
    background-color: #f8f9fa;
    color: #212529;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: normal;
    padding: 0;
    margin: 0;
}

/* 每行样式 */
.cm-line {
    line-height: 24px;
    height: 24px;
    padding: 0 8px;
    color: #212529;
    background-color: #f8f9fa;
    font-weight: normal;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 左侧边栏（包含行号） */
:deep(.cm-gutters) {
    background-color: #E2E4E6;
    border-right: none;
}

/* 行号样式 */
:deep(.cm-lineNumbers .cm-gutterElement) {
    color: #6c757d;
    font-size: 14px;
    line-height: 24px;
    text-align: center;
    background-color: #E2E4E6;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 选中文本样式 */
.cm-selectionBackground {
    background-color: rgba(13, 110, 253, 0.25) !important;
}

/* 光标样式 */
.cm-cursor {
    border-left: 1px solid #212529;
}

/* 聚焦状态 */
.cm-focused {
    outline: none;
}

/* 滚动条样式 */
.cm-scroller::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.cm-scroller::-webkit-scrollbar-track {
    background: #f1f3f4;
}

.cm-scroller::-webkit-scrollbar-thumb {
    background: #c1c8cd;
    border-radius: 4px;
}

.cm-scroller::-webkit-scrollbar-thumb:hover {
    background: #a8b2ba;
}

.cm-scroller::-webkit-scrollbar-corner {
    background: #f1f3f4;
}

/* 确保编辑器高度固定 */
:deep(.cm-editor) {
    height: 300px;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

:deep(.cm-scroller) {
    max-height: 300px;
}

/* 基本样式 */
:deep(.cm-line) {
    line-height: 24px;
    font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
}
</style>