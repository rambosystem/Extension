<template>
  <div class="table-config-bar">
    <div class="config-items">
      <div class="config-item line-height-config" @click.stop="toggleLineHeightDropdown">
        <img src="@/assets/line_height.svg" alt="行高" class="config-icon" />
        <div v-if="showLineHeightDropdown" class="line-height-dropdown" @click.stop>
          <div class="dropdown-option" :class="{ active: getCurrentLineHeightKey() === 'compact' }"
            @click="selectLineHeight('compact')">
            Compact
          </div>
          <div class="dropdown-option" :class="{ active: getCurrentLineHeightKey() === 'standard' }"
            @click="selectLineHeight('standard')">
            Standard
          </div>
          <div class="dropdown-option" :class="{ active: getCurrentLineHeightKey() === 'wide' }"
            @click="selectLineHeight('wide')">
            Wide
          </div>
        </div>
      </div>
      <div class="config-item" @click="handleColumnConfig">
        <img src="@/assets/colum_config.svg" alt="自定义列" class="config-icon" />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * LibraryTableConfig - Library 表格配置组件
 * 
 * 封装了表格配置栏功能，包括：
 * - 行高配置（Compact、Standard、Wide）
 * - 自定义列配置
 * 
 * @component
 * @example
 * <LibraryTableConfig @lineHeight="handleLineHeight" @columnConfig="handleColumnConfig" />
 */
import { onMounted, onUnmounted, ref } from "vue";

const emit = defineEmits(["lineHeight", "columnConfig"]);

// 行高配置相关状态
const showLineHeightDropdown = ref(false);
const lineHeight = ref(50); // 默认 50px

// 行高选项映射
const lineHeightOptions = {
  compact: 40,
  standard: 50,
  wide: 60,
};

/**
 * 切换行高下拉菜单显示状态
 */
const toggleLineHeightDropdown = () => {
  showLineHeightDropdown.value = !showLineHeightDropdown.value;
};

/**
 * 选择行高选项
 */
const selectLineHeight = (key) => {
  const height = lineHeightOptions[key];
  lineHeight.value = height;
  showLineHeightDropdown.value = false;
  emit("lineHeight", height);
};

/**
 * 获取当前行高对应的 key
 */
const getCurrentLineHeightKey = () => {
  if (lineHeight.value === 40) return "compact";
  if (lineHeight.value === 50) return "standard";
  if (lineHeight.value === 60) return "wide";
  return "standard";
};

/**
 * 处理自定义列配置点击
 */
const handleColumnConfig = () => {
  emit("columnConfig");
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (!event.target.closest(".line-height-config")) {
    showLineHeightDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style lang="scss" scoped>
.table-config-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 0;
}

.config-items {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.config-item:hover {
  background-color: #f5f7fa;
}

.config-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.line-height-config {
  position: relative;
}

.line-height-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
  z-index: 1000;
}

.dropdown-option {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #66666c;
  transition: background-color 0.2s;
}

.dropdown-option:hover {
  background-color: #f5f7fa;
}

.dropdown-option.active {
  color: #409eff;
  font-weight: 500;
}
</style>
