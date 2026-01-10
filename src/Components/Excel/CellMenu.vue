<template>
  <el-dropdown trigger="click" placement="right-start" :show-arrow="false" @command="handleCommand"
    @visible-change="handleVisibleChange">
    <div class="cell-menu-button" :class="{ 'is-active': isMenuOpen }" @mousedown.stop
      @keydown.stop="handleButtonKeydown">
      <img src="@/assets/down_arrow.svg" alt="Menu" class="cell-menu-icon" />
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <!-- 复制 -->
        <el-dropdown-item :command="{ action: 'copy', rowIndex }">
          <div class="menu-item-content">
            <span class="menu-item-text">Copy</span>
            <span class="menu-item-shortcut">{{ copyShortcut }}</span>
          </div>
        </el-dropdown-item>
        <!-- 粘贴 -->
        <el-dropdown-item :command="{ action: 'paste', rowIndex }" :disabled="!canPaste">
          <div class="menu-item-content">
            <span class="menu-item-text">Paste</span>
            <span class="menu-item-shortcut">{{ pasteShortcut }}</span>
          </div>
        </el-dropdown-item>
        <!-- Undo -->
        <el-dropdown-item divided :command="{ action: 'undo', rowIndex }" :disabled="!canUndo">
          <div class="menu-item-content">
            <span class="menu-item-text">Undo</span>
            <span class="menu-item-shortcut">{{ undoShortcut }}</span>
          </div>
        </el-dropdown-item>
        <!-- Redo -->
        <el-dropdown-item :command="{ action: 'redo', rowIndex }" :disabled="!canRedo">
          <div class="menu-item-content">
            <span class="menu-item-text">Redo</span>
            <span class="menu-item-shortcut">{{ redoShortcut }}</span>
          </div>
        </el-dropdown-item>
        <!-- 插入行 -->
        <el-dropdown-item divided :command="{ action: 'insertRowBelow', rowIndex }">
          <div class="menu-item-content">
            <span class="menu-item-text">Insert Row Below</span>
            <span class="menu-item-shortcut">{{ insertRowShortcut }}</span>
          </div>
        </el-dropdown-item>
        <!-- 删除行 -->
        <el-dropdown-item :command="{ action: 'deleteRow', rowIndex }">
          <div class="menu-item-content">
            <span class="menu-item-text">Delete Row</span>
            <span class="menu-item-shortcut">{{ deleteRowShortcut }}</span>
          </div>
        </el-dropdown-item>
        <!-- 自定义菜单项 -->
        <template v-if="validatedCustomMenuItems.length > 0">
          <el-dropdown-item v-for="(item, index) in validatedCustomMenuItems" :key="item.id" :divided="index === 0"
            :command="{ action: 'custom', id: item.id, rowIndex }" :disabled="isCustomItemDisabled(item)">
            <div class="menu-item-content">
              <span class="menu-item-text">{{ item.label }}</span>
              <span v-if="item.shortcut" class="menu-item-shortcut">{{
                normalizeShortcut(item.shortcut)
              }}</span>
            </div>
          </el-dropdown-item>
        </template>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  normalizeShortcutForPlatform,
  buildShortcut,
} from "../../composables/Excel/useKeyboard";
import type { CustomMenuItem } from "../../composables/Excel/useKeyboard";
import type { MenuContext } from "../../composables/Excel/types";

/**
 * CellMenu - 单元格菜单组件
 *
 * 用于 Excel 组件的单元格右键菜单，提供行操作功能
 *
 * @component
 * @example
 * <CellMenu
 *   :row-index="0"
 *   :can-undo="true"
 *   :can-redo="false"
 *   :can-paste="true"
 *   @command="handleMenuCommand"
 * />
 */
interface Props {
  rowIndex: number;
  customMenuItems?: CustomMenuItem[];
  context?: MenuContext | null;
  canUndo?: boolean;
  canRedo?: boolean;
  canPaste?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  customMenuItems: () => [],
  context: null,
  canUndo: false,
  canRedo: false,
  canPaste: false,
});

/**
 * 菜单命令事件
 * @event command
 * @param {Object} command - 命令对象 { action: string, rowIndex: number }
 */
/**
 * 自定义菜单项点击事件
 * @event custom-action
 * @param {Object} payload - 事件载荷 { id: string, context: Object }
 */
/**
 * 菜单可见性变化事件
 * @event visible-change
 * @param {boolean} visible - 是否可见
 */
const emit = defineEmits(["command", "custom-action", "visible-change"]);

const isMenuOpen = ref(false);

// 使用统一的跨平台快捷键工具函数
const copyShortcut = computed(() => buildShortcut("C"));
const pasteShortcut = computed(() => buildShortcut("V"));
const undoShortcut = computed(() => buildShortcut("Z"));
const redoShortcut = computed(() => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return isMac ? buildShortcut("Z", { shift: true }) : buildShortcut("Y");
});
const insertRowShortcut = computed(() => buildShortcut("Enter"));
const deleteRowShortcut = computed(() => buildShortcut("Delete"));

/**
 * 规范化自定义菜单项的快捷键显示
 */
const normalizeShortcut = (shortcut: string | undefined): string => {
  if (!shortcut) return "";
  return normalizeShortcutForPlatform(shortcut);
};

/**
 * 验证并过滤自定义菜单项
 * 只显示通过 validate 验证的菜单项
 */
const validatedCustomMenuItems = computed(() => {
  if (!props.customMenuItems || props.customMenuItems.length === 0) {
    return [];
  }

  if (!props.context) {
    return [];
  }

  return props.customMenuItems.filter((item) => {
    // 如果没有 validate 函数，默认显示
    if (typeof item.validate !== "function") {
      return true;
    }
    // 调用 validate 函数，传入 context
    try {
      return props.context ? item.validate(props.context) : false;
    } catch (error) {
      console.warn(
        `CellMenu: validate function error for menu item "${item.id}":`,
        error
      );
      return false;
    }
  });
});

/**
 * 判断自定义菜单项是否禁用
 * @param {Object} item - 菜单项配置
 * @returns {boolean}
 */
const isCustomItemDisabled = (item: CustomMenuItem): boolean => {
  if (!props.context) {
    return false;
  }

  // 如果没有 disabled 函数，默认不禁用
  if (typeof item.disabled !== "function") {
    return false;
  }

  // 调用 disabled 函数，传入 context
  try {
    return item.disabled(props.context);
  } catch (error) {
    console.warn(
      `CellMenu: disabled function error for menu item "${item.id}":`,
      error
    );
    return false;
  }
};

/**
 * 菜单命令类型
 */
interface MenuCommand {
  action: string;
  rowIndex: number;
  id?: string;
}

/**
 * 处理菜单命令
 * @param {Object} command - 菜单命令对象
 */
const handleCommand = (command: MenuCommand): void => {
  // 如果是自定义菜单项，触发 custom-action 事件
  if (command.action === "custom") {
    emit("custom-action", {
      id: command.id,
      context: props.context,
    });
  } else {
    // 默认菜单项（包括 copy, paste, undo, redo, insertRowBelow, deleteRow），触发 command 事件
    emit("command", command);
  }
};

/**
 * 处理菜单按钮键盘事件
 * 阻止 Ctrl+Enter / Cmd+Enter 触发菜单打开
 */
const handleButtonKeydown = (event: KeyboardEvent): void => {
  const isEnterKey = event.key === "Enter" || event.code === "Enter";
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;

  // 如果是 Ctrl+Enter 或 Cmd+Enter，阻止事件传播，防止菜单打开
  if (isEnterKey && isCtrlOrCmd) {
    event.preventDefault();
    event.stopPropagation();
  }
};

/**
 * 处理菜单显示/隐藏状态变化
 */
const handleVisibleChange = (visible: boolean): void => {
  isMenuOpen.value = visible;
  emit("visible-change", visible);
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
  z-index: 100;
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
      filter: brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(1352%) hue-rotate(194deg) brightness(98%) contrast(96%);
    }
  }

  &:active,
  &:focus {
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.1);

    .cell-menu-icon {
      filter: brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(1352%) hue-rotate(194deg) brightness(98%) contrast(96%);
    }
  }
}

// ==================== Menu Item Styles ====================
// 覆盖 Element Plus 的默认样式，确保自定义内容正确显示
:deep(.el-dropdown-menu__item) {
  padding: 8px 12px;
  user-select: none; // 禁用文本选中
  transition: background-color $transition-fast;

  .menu-item-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 16px;
    margin: 0;
    padding: 0;
  }

  // Hover 状态
  &:hover {
    background-color: #f0f1f2;

    .menu-item-shortcut {
      background-color: #e2e4e6;
    }
  }

  // 激活/聚焦状态（与 hover 统一）
  &:active,
  &:focus,
  &.is-focus,
  &.is-active {
    background-color: #f0f1f2;

    .menu-item-shortcut {
      background-color: #e2e4e6;
    }
  }

  // 禁用状态
  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover,
    &:active,
    &:focus {
      background-color: transparent;

      .menu-item-shortcut {
        background-color: #f0f1f2;
      }
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
  transition: background-color $transition-fast;
}
</style>
