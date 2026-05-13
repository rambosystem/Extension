<template>
    <div class="excel-row header-row">
        <div class="excel-cell header-cell corner-cell" @mousedown="$emit('corner-click')"></div>
        <div v-for="(col, index) in displayColumns" :key="col" class="excel-cell header-cell"
            :class="{ 'active-header': isInSelectionHeader(index, 'col') }" :style="index === displayColumns.length - 1
                ? {
                    flex: 1,
                    minWidth: getColumnWidth(index) + 'px',
                }
                : {
                    width: getColumnWidth(index) + 'px',
                    minWidth: getColumnWidth(index) + 'px',
                }
                " @mousedown="$emit('column-header-mousedown', index, $event)"
            @mouseenter="$emit('column-header-mouseenter', index)">
            {{ col }}
            <ColumnResizer v-if="enableColumnResize && Number(index) < displayColumns.length - 1"
                @mousedown.stop="$emit('column-resize-start', Number(index), $event)"
                @dblclick="$emit('column-resize-dblclick', Number(index))" />
        </div>
    </div>
</template>

<script setup lang="ts">
import ColumnResizer from "./ColumnResizer.vue";

/**
 * HeaderRow 组件 Props
 */
interface Props {
    displayColumns: string[];
    getColumnWidth: (index: number) => number;
    isInSelectionHeader: (index: number, type: 'col' | 'row') => boolean;
    enableColumnResize?: boolean;
}

defineProps<Props>();

/**
 * HeaderRow 组件 Emits
 */
defineEmits<{
    'corner-click': [];
    'column-header-mousedown': [index: number, event: MouseEvent];
    'column-header-mouseenter': [index: number];
    'column-resize-start': [index: number, event: MouseEvent];
    'column-resize-dblclick': [index: number];
}>();
</script>
