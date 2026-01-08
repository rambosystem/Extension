<template>
  <el-dropdown trigger="click" placement="right-start" :show-arrow="false" @command="handleCommand"
    @visible-change="handleVisibleChange">
    <div class="cell-menu-button" :class="{ 'is-active': isMenuOpen }" @mousedown.stop>
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
        <!-- 自定义菜单项 -->
        <template v-if="validatedCustomMenuItems.length > 0">
          <el-dropdown-item v-for="item in validatedCustomMenuItems" :key="item.id"
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

<script setup>
import { ref, computed } from "vue";
import {
  normalizeShortcutForPlatform,
  getModifierKey,
  buildShortcut,
} from "../../composables/Excel/useKeyboard.js";

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
  /**
   * 自定义菜单项配置
   * @type {Array}
   * @default []
   * @description
   * 自定义菜单项配置数组，每个配置项包含：
   * - id: 唯一标识
   * - label: 显示文本
   * - shortcut: 快捷键（可选）
   * - validate: 验证函数，接收 context 对象，返回是否显示该菜单项（可选）
   * - disabled: 禁用函数，接收 context 对象，返回是否禁用该菜单项（可选）
   * @example
   * [
   *   {
   *     id: 'auto-increment',
   *     label: '自增填充',
   *     shortcut: 'Ctrl+Alt+A',
   *     validate: (ctx) => ctx.normalizedSelection?.minCol === 0
   *   }
   * ]
   */
  customMenuItems: {
    type: Array,
    default: () => [],
  },
  /**
   * 上下文对象，传递给自定义菜单项的验证和执行函数
   * @type {Object}
   * @default null
   * @description
   * 包含以下属性：
   * - normalizedSelection: 归一化选区信息
   * - activeCell: 活动单元格
   * - rowIndex: 当前行索引
   * - tableData: 表格数据（只读）
   * - updateCell: 更新单元格方法
   */
  context: {
    type: Object,
    default: null,
  },
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
const emit = defineEmits(["command", "custom-action"]);

const isMenuOpen = ref(false);

// 使用统一的跨平台快捷键工具函数
const insertRowShortcut = computed(() => buildShortcut("Enter"));
const deleteRowShortcut = computed(() => buildShortcut("Delete"));

/**
 * 规范化自定义菜单项的快捷键显示
 * 根据平台自动转换 Ctrl/Cmd
 * @param {string} shortcut - 原始快捷键字符串
 * @returns {string} 规范化后的快捷键字符串
 */
const normalizeShortcut = (shortcut) => {
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
      return item.validate(props.context);
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
const isCustomItemDisabled = (item) => {
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
 * 处理菜单命令
 * @param {Object} command - 菜单命令对象
 */
const handleCommand = (command) => {
  // 如果是自定义菜单项，触发 custom-action 事件
  if (command.action === "custom") {
    emit("custom-action", {
      id: command.id,
      context: props.context,
    });
  } else {
    // 默认菜单项，触发 command 事件
    emit("command", command);
  }
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
