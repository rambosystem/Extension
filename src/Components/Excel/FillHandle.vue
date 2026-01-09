<template>
  <div class="fill-handle" @mousedown.stop="handleMouseDown"></div>
</template>

<script setup lang="ts">
/**
 * FillHandle - 填充手柄组件
 */
const emit = defineEmits<{
  mousedown: [event: MouseEvent];
}>();

/**
 * 处理鼠标按下事件
 */
const handleMouseDown = (event: MouseEvent): void => {
  emit("mousedown", event);
};
</script>

<style scoped lang="scss">
// ==================== 变量定义 ====================
$primary-color: #409eff;
$white: #fff;
$border-width: 1px;
$fill-handle-size: 7px;
$fill-handle-offset: -4px;

// ==================== 填充手柄 ====================
.fill-handle {
  position: absolute;
  right: $fill-handle-offset;
  bottom: $fill-handle-offset;
  width: $fill-handle-size;
  height: $fill-handle-size;
  background-color: $primary-color;
  border: $border-width solid $white;
  cursor: crosshair;
  z-index: 20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.2);
  }
}
</style>
