<template>
  <el-dropdown
    trigger="click"
    placement="right-start"
    :show-arrow="false"
    @command="handleCommand"
    @visible-change="handleVisibleChange"
  >
    <div
      class="cell-menu-button"
      :class="{ 'is-active': isMenuOpen }"
      @mousedown.stop
    >
      <img src="@/assets/down_arrow.svg" alt="Menu" class="cell-menu-icon" />
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item :command="{ action: 'insertRowBelow', rowIndex }">
          <div class="menu-item-content">
            <span class="menu-item-text">Insert Row Below</span>
            <span class="menu-item-shortcut">{{ insertRowShortcut }}</span>
          </div>
        </el-dropdown-item>
        <el-dropdown-item :command="{ action: 'deleteRow', rowIndex }">
          <div class="menu-item-content">
            <span class="menu-item-text">Delete Row</span>
            <span class="menu-item-shortcut">{{ deleteRowShortcut }}</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ref, computed } from "vue";

/**
 * CellMenu - 单元格菜单组件
 *
 * 用于 Excel 组件的单元格右键菜单，提供行操作功能
 *
 * @component
 * @example
 * <CellMenu
 *   :row-index="0"
 *   @command="handleMenuCommand"
 * />
 */
const props = defineProps({
  /**
   * 行索引
   * @type {number}
   * @required
   */
  rowIndex: {
    type: Number,
    required: true,
  },
});

/**
 * 菜单命令事件
 * @event command
 * @param {Object} command - 命令对象 { action: string, rowIndex: number }
 */
const emit = defineEmits(["command"]);

const isMenuOpen = ref(false);

// 检测是否为 Mac 系统
const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
});

// 根据平台显示正确的修饰键
const modifierKey = computed(() => (isMac.value ? "Cmd" : "Ctrl"));
const insertRowShortcut = computed(() => `${modifierKey.value}+Enter`);
const deleteRowShortcut = computed(() => `${modifierKey.value}+Delete`);

/**
 * 处理菜单命令
 * @param {Object} command - 菜单命令对象
 */
const handleCommand = (command) => {
  emit("command", command);
};

/**
 * 处理菜单显示/隐藏状态变化
 * @param {boolean} visible - 菜单是否可见
 */
const handleVisibleChange = (visible) => {
  isMenuOpen.value = visible;
};
</script>

<style scoped lang="scss">
// ==================== 变量定义 ====================
$border-color: #e4e7ed;
$primary-color: #409eff;
$white: #fff;
$border-width: 1px;
$transition-fast: 0.05s ease;

// ==================== Cell Menu Button ====================
.cell-menu-button {
  position: absolute;
  top: -13px;
  right: 5px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $white;
  border: $border-width solid $border-color;
  border-radius: 4px;
  cursor: pointer;
  z-index: 21;
  transition: background-color $transition-fast, border-color $transition-fast,
    transform $transition-fast;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: rgba($primary-color, 0.05);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .cell-menu-icon {
    width: 12px;
    height: 12px;
    display: block;
    pointer-events: none;
    transition: filter $transition-fast;
  }

  &.is-active {
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.1);

    .cell-menu-icon {
      // 使用 filter 将灰色图标变为蓝色
      // 将 #505258 (灰色) 转换为 $primary-color (蓝色)
      filter: brightness(0) saturate(100%) invert(27%) sepia(96%)
        saturate(1352%) hue-rotate(194deg) brightness(98%) contrast(96%);
    }
  }

  &:active,
  &:focus {
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.1);

    .cell-menu-icon {
      filter: brightness(0) saturate(100%) invert(27%) sepia(96%)
        saturate(1352%) hue-rotate(194deg) brightness(98%) contrast(96%);
    }
  }
}

// ==================== Menu Item Styles ====================
// 覆盖 Element Plus 的默认样式，确保自定义内容正确显示
:deep(.el-dropdown-menu__item) {
  padding: 8px 12px;

  .menu-item-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 16px;
    margin: 0;
    padding: 0;
  }

  &:hover {
    background-color: #f0f1f2;

    .menu-item-shortcut {
      background-color: #e2e4e6;
    }
  }
}

.menu-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.menu-item-text {
  flex: 1;
  color: #303133;
  font-size: 14px;
}

.menu-item-shortcut {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background-color: #f0f1f2;
  border-radius: 4px;
  font-size: 12px;
  color: #4a4b4d;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  white-space: nowrap;
  min-width: fit-content;
  line-height: 1.4;
}
</style>
