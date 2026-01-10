<template>
  <div
    class="row-resizer"
    @mousedown.stop="handleMouseDown"
    @dblclick.stop="handleDoubleClick"
  ></div>
</template>

<script setup lang="ts">
/**
 * RowResizer - 行调整器组件
 */
const emit = defineEmits<{
  mousedown: [event: MouseEvent];
  dblclick: [event: MouseEvent];
}>();

/**
 * 处理鼠标按下事件
 */
const handleMouseDown = (event: MouseEvent): void => {
  emit("mousedown", event);
};

/**
 * 处理双击事件
 */
const handleDoubleClick = (event: MouseEvent): void => {
  emit("dblclick", event);
};
</script>

<style scoped lang="scss">
// ==================== 变量定义 ====================
$primary-color: #409eff;
$resizer-width: 6px;
$resizer-offset: -3px;
$transition-slow: 0.2s;

// ==================== 行调整器 ====================
.row-resizer {
  position: absolute;
  left: 0;
  bottom: $resizer-offset;
  width: 100%;
  height: $resizer-width;
  cursor: row-resize;
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
