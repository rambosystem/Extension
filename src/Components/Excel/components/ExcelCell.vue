<template>
    <div class="excel-cell" :data-row="rowIndex" :data-col="colIndex" :class="[
        {
            active: isActive,
            'in-selection': isInSelection,
            'multi-select': isMultiSelect,
            'drag-target': isDragTarget,
        },
        selectionBorderClass,
        copiedRangeBorderClass,
        multipleDragBorderClass,
        dragTargetBorderClass,
    ]" :style="{
        ...(isLastColumn
            ? { flex: 1, minWidth: columnWidth + 'px' }
            : {
                width: columnWidth + 'px',
                minWidth: columnWidth + 'px',
            }),
        height: rowHeight + 'px',
        minHeight: rowHeight + 'px',
        alignItems: cellDisplayStyle.align,
    }" @mousedown="$emit('cell-mousedown', $event)" @dblclick="$emit('cell-dblclick')"
        @mouseenter="$emit('cell-mouseenter')">
        <input v-if="isEditing" :value="cellValue" @input="handleInput" class="cell-input"
            @blur="$emit('cell-input-blur')"
            @keydown.enter.prevent.stop="(e) => $emit('cell-input-enter', e as KeyboardEvent)"
            @keydown.tab.prevent.stop="(e) => $emit('cell-input-tab', e as KeyboardEvent)"
            @keydown.esc="$emit('cell-input-esc')"
            :ref="(el) => $emit('cell-input-ref', el as HTMLInputElement | null)" />

        <span v-else class="cell-content" :class="{
            'cell-text-wrap': cellDisplayStyle.wrap,
            'cell-text-ellipsis': cellDisplayStyle.ellipsis,
        }">
            {{ cellValue }}
        </span>

        <FillHandle v-if="showFillHandle" @mousedown="$emit('fill-drag-start')" />

        <CellMenu v-if="showCellMenu" :row-index="rowIndex" :custom-menu-items="customMenuItems" :context="menuContext"
            :can-undo="canUndo" :can-redo="canRedo" :can-paste="canPaste" @command="$emit('cell-menu-command', $event)"
            @custom-action="$emit('cell-menu-custom-action', $event)"
            @visible-change="$emit('cell-menu-visible-change', $event)" />
    </div>
</template>

<script setup lang="ts">
// 不再需要 computed，直接使用 props
import CellMenu from "./CellMenu.vue";
import FillHandle from "./FillHandle.vue";
import type { MenuContext } from "../composables/types";
import type { CellDisplayStyle } from "../composables/useCellDisplay";
import type { CustomMenuItem } from "../composables/useKeyboard";

/**
 * ExcelCell 组件 Props
 */
interface Props {
    rowIndex: number;
    colIndex: number;
    cellValue: string;
    isLastColumn: boolean;
    isActive: boolean;
    isInSelection: boolean;
    isMultiSelect: boolean;
    isDragTarget: boolean;
    isEditing: boolean;
    selectionBorderClass: string[];
    copiedRangeBorderClass: string[];
    multipleDragBorderClass: string[];
    dragTargetBorderClass: string[];
    cellDisplayStyle: CellDisplayStyle;
    columnWidth: number;
    rowHeight: number;
    showFillHandle: boolean;
    showCellMenu: boolean;
    customMenuItems?: CustomMenuItem[];
    menuContext: MenuContext;
    canUndo: boolean;
    canRedo: boolean;
    canPaste: boolean;
}

const props = defineProps<Props>();

/**
 * ExcelCell 组件 Emits
 */
const emit = defineEmits<{
    'cell-mousedown': [event: MouseEvent];
    'cell-dblclick': [];
    'cell-mouseenter': [];
    'cell-input-blur': [];
    'cell-input-enter': [event?: KeyboardEvent];
    'cell-input-tab': [event?: KeyboardEvent];
    'cell-input-change': [value: string, rowIndex: number, colIndex: number];
    'cell-input-esc': [];
    'cell-input-ref': [el: HTMLInputElement | null];
    'fill-drag-start': [];
    'cell-menu-command': [command: string];
    'cell-menu-custom-action': [payload: { id: string; context: MenuContext }];
    'cell-menu-visible-change': [visible: boolean];
}>();

// 单元格输入处理函数
const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    emit('cell-input-change', target.value, props.rowIndex, props.colIndex);
};
</script>
