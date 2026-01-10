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
        <input v-if="isEditing" v-model="cellValueModel" class="cell-input" @blur="$emit('cell-input-blur')"
            @keydown.enter.prevent.stop="$emit('cell-input-enter')" @keydown.tab.prevent.stop="$emit('cell-input-tab')"
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
import { computed } from "vue";
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
defineEmits<{
    'cell-mousedown': [event: MouseEvent];
    'cell-dblclick': [];
    'cell-mouseenter': [];
    'cell-input-blur': [];
    'cell-input-enter': [];
    'cell-input-tab': [];
    'cell-input-esc': [];
    'cell-input-ref': [el: HTMLInputElement | null];
    'fill-drag-start': [];
    'cell-menu-command': [command: string];
    'cell-menu-custom-action': [payload: { id: string; context: MenuContext }];
    'cell-menu-visible-change': [visible: boolean];
}>();

// 单元格值的双向绑定（用于编辑）
// 注意：这里使用 v-model 直接绑定到 tableData，由父组件管理状态
const cellValueModel = computed({
    get: () => props.cellValue,
    set: (_value: string) => {
        // 通过事件通知父组件更新值
        // 这里不直接修改，由父组件通过 v-model 或事件处理
    },
});
</script>
