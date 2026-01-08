<template>
  <div
    class="column-resizer"
    @mousedown.stop="handleMouseDown"
    @dblclick.stop="handleDoubleClick"
  ></div>
</template>

<script setup>
/**
 * ColumnResizer - 列调整器组件
 *
 * Excel 组件中用于调整列宽的拖拽区域
 *
 * @component
 * @example
 * <ColumnResizer
 *   @mousedown="startColumnResize"
 *   @dblclick="handleDoubleClickResize"
 * />
 */
const emit = defineEmits(["mousedown", "dblclick"]);

/**
 * 处理鼠标按下事件
 * @param {MouseEvent} event - 鼠标事件
 */
const handleMouseDown = (event) => {
  emit("mousedown", event);
};

/**
 * 处理双击事件
 * @param {MouseEvent} event - 鼠标事件
 */
const handleDoubleClick = (event) => {
  emit("dblclick", event);
};
</script>

<style scoped lang="scss">
// ==================== 变量定义 ====================
$primary-color: #409eff;
$resizer-width: 6px;
$resizer-offset: -3px;
$transition-slow: 0.2s;

// ==================== 列调整器 ====================
.column-resizer {
  position: absolute;
  top: 0;
  right: $resizer-offset;
  width: $resizer-width;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background-color $transition-slow;

  &:hover {
    background-color: rgba($primary-color, 0.3);
  }

  &:active {
    background-color: rgba($primary-color, 0.5);
  }
}
</style>
