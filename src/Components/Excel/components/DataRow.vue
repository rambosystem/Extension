<template>
    <div class="excel-row">
        <div class="excel-cell row-number" :class="{ 'active-header': isInSelectionHeader(rowIndex, 'row') }" :style="{
            height: getRowHeight(rowIndex) + 'px',
            minHeight: getRowHeight(rowIndex) + 'px',
        }" @mousedown="$emit('row-number-mousedown', rowIndex, $event)"
            @mouseenter="$emit('row-number-mouseenter', rowIndex)">
            {{ rowIndex + 1 }}
            <RowResizer v-if="enableRowResize" @mousedown.stop="$emit('row-resize-start', rowIndex, $event)"
                @dblclick="$emit('row-resize-dblclick', rowIndex)" />
        </div>

        <ExcelCell v-for="(_col, colIndex) in columns" :key="colIndex" :row-index="rowIndex" :col-index="colIndex"
            :cell-value="tableData[rowIndex]?.[colIndex]" :is-last-column="colIndex === columns.length - 1"
            :is-active="isActive(rowIndex, colIndex) && !isMultiSelect"
            :is-in-selection="isInSelection(rowIndex, colIndex)"
            :is-multi-select="isMultiSelect && isInSelection(rowIndex, colIndex)"
            :is-drag-target="isInDragArea(rowIndex, colIndex)" :is-editing="isEditing(rowIndex, colIndex)"
            :selection-border-class="getSelectionBorderClass(rowIndex, colIndex)"
            :copied-range-border-class="getCopiedRangeBorderClass(rowIndex, colIndex)"
            :multiple-drag-border-class="getMultipleDragBorderClass(rowIndex, colIndex)"
            :drag-target-border-class="getDragTargetBorderClass(rowIndex, colIndex)"
            :cell-display-style="getCellDisplayStyle(rowIndex, colIndex)" :column-width="getColumnWidth(colIndex)"
            :row-height="getRowHeight(rowIndex)" :show-fill-handle="enableFillHandle &&
                isSelectionBottomRight(rowIndex, colIndex) &&
                !editingCell
                " :show-cell-menu="shouldShowCellMenu(rowIndex, colIndex)" :custom-menu-items="customMenuItems"
            :menu-context="createMenuContext(rowIndex)" :can-undo="canUndo" :can-redo="canRedo" :can-paste="canPaste"
            @cell-mousedown="$emit('cell-mousedown', rowIndex, colIndex, $event)"
            @cell-dblclick="$emit('cell-dblclick', rowIndex, colIndex)"
            @cell-mouseenter="$emit('cell-mouseenter', rowIndex, colIndex)" @cell-input-blur="$emit('cell-input-blur')"
            @cell-input-enter="(event) => $emit('cell-input-enter', event)"
            @cell-input-tab="(event) => $emit('cell-input-tab', event)"
            @cell-input-change="(value, row, col) => $emit('cell-input-change', value, row, col)"
            @cell-input-esc="$emit('cell-input-esc')"
            @cell-input-ref="$emit('cell-input-ref', $event, rowIndex, colIndex)"
            @fill-drag-start="$emit('fill-drag-start', rowIndex, colIndex)"
            @cell-menu-command="(cmd) => {
              const normalized = typeof cmd === 'string' ? { action: cmd, rowIndex } : cmd;
              $emit('cell-menu-command', normalized);
            }"
            @cell-menu-custom-action="$emit('cell-menu-custom-action', $event)"
            @cell-menu-visible-change="$emit('cell-menu-visible-change', $event)" />
    </div>
</template>

<script setup lang="ts">
import ExcelCell from "./ExcelCell.vue";
import RowResizer from "./RowResizer.vue";
import type { MenuContext } from "../composables/types";
import type { CellDisplayStyle } from "../composables/useCellDisplay";
import type { CustomMenuItem } from "../composables/useKeyboard";

/**
 * DataRow 组件 Props
 */
interface Props {
    rowIndex: number;
    columns: string[];
    tableData: string[][];
    getColumnWidth: (index: number) => number;
    getRowHeight: (index: number) => number;
    getCellDisplayStyle: (rowIndex: number, colIndex: number) => CellDisplayStyle;
    isInSelectionHeader: (index: number, type: 'col' | 'row') => boolean;
    isActive: (rowIndex: number, colIndex: number) => boolean;
    isInSelection: (rowIndex: number, colIndex: number) => boolean;
    isInDragArea: (rowIndex: number, colIndex: number) => boolean;
    isEditing: (rowIndex: number, colIndex: number) => boolean;
    isSelectionBottomRight: (rowIndex: number, colIndex: number) => boolean;
    shouldShowCellMenu: (rowIndex: number, colIndex: number) => boolean;
    getSelectionBorderClass: (rowIndex: number, colIndex: number) => string[];
    getCopiedRangeBorderClass: (rowIndex: number, colIndex: number) => string[];
    getMultipleDragBorderClass: (rowIndex: number, colIndex: number) => string[];
    getDragTargetBorderClass: (rowIndex: number, colIndex: number) => string[];
    createMenuContext: (rowIndex: number) => MenuContext;
    isMultiSelect: boolean;
    editingCell: { row: number; col: number } | null;
    enableRowResize?: boolean;
    enableFillHandle?: boolean;
    customMenuItems?: CustomMenuItem[];
    canUndo: boolean;
    canRedo: boolean;
    canPaste: boolean;
}

defineProps<Props>();

/**
 * DataRow 组件 Emits
 */
defineEmits<{
    'row-number-mousedown': [rowIndex: number, event: MouseEvent];
    'row-number-mouseenter': [rowIndex: number];
    'row-resize-start': [rowIndex: number, event: MouseEvent];
    'row-resize-dblclick': [rowIndex: number];
    'cell-mousedown': [rowIndex: number, colIndex: number, event: MouseEvent];
    'cell-dblclick': [rowIndex: number, colIndex: number];
    'cell-mouseenter': [rowIndex: number, colIndex: number];
    'cell-input-blur': [];
    'cell-input-enter': [event?: KeyboardEvent];
    'cell-input-tab': [event?: KeyboardEvent];
    'cell-input-esc': [];
    'cell-input-change': [value: string, rowIndex: number, colIndex: number];
    'cell-input-ref': [el: HTMLInputElement | null, rowIndex: number, colIndex: number];
    'fill-drag-start': [rowIndex: number, colIndex: number];
    'cell-menu-command': [command: { action: string; rowIndex: number }];
    'cell-menu-custom-action': [payload: { id: string; context: MenuContext }];
    'cell-menu-visible-change': [visible: boolean];
}>();
</script>
