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
      <div class="config-item column-config" @click.stop="toggleColumnConfigDropdown">
        <img src="@/assets/colum_config.svg" alt="自定义列" class="config-icon" />
        <div v-if="showColumnConfigDropdown" class="column-config-dropdown" @click.stop>
          <div class="dropdown-option"
            :class="{ checked: selectedColumns.includes('project'), disabled: !canToggleColumn('project') }"
            @click="toggleColumn('project')">
            {{ t("library.project") }}
          </div>
          <div class="dropdown-option"
            :class="{ checked: selectedColumns.includes('english'), disabled: !canToggleColumn('english') }"
            @click="toggleColumn('english')">
            {{ t("library.english") }}
          </div>
          <div class="dropdown-option"
            :class="{ checked: selectedColumns.includes('chinese'), disabled: !canToggleColumn('chinese') }"
            @click="toggleColumn('chinese')">
            {{ t("library.chinese") }}
          </div>
          <div class="dropdown-option"
            :class="{ checked: selectedColumns.includes('japanese'), disabled: !canToggleColumn('japanese') }"
            @click="toggleColumn('japanese')">
            {{ t("library.japanese") }}
          </div>
          <div class="dropdown-option"
            :class="{ checked: selectedColumns.includes('spanish'), disabled: !canToggleColumn('spanish') }"
            @click="toggleColumn('spanish')">
            {{ t("library.spanish") }}
          </div>
        </div>
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
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "../../composables/Core/useI18n.js";

const { t } = useI18n();
const emit = defineEmits(["lineHeight", "columnConfig"]);

const props = defineProps({
  /**
   * 初始行高（像素）
   * @type {Number}
   * @default 50
   */
  initialRowHeight: {
    type: Number,
    default: 50,
  },
  /**
   * 初始可见列
   * @type {Array<String>}
   * @default ["english", "chinese", "japanese"]
   */
  initialVisibleColumns: {
    type: Array,
    default: () => ["english", "chinese", "japanese"],
  },
});

// 行高配置相关状态
const showLineHeightDropdown = ref(false);
const lineHeight = ref(props.initialRowHeight);

// 自定义列配置相关状态
const showColumnConfigDropdown = ref(false);
const selectedColumns = ref([...props.initialVisibleColumns]);

// 同步 props 变化
watch(
  () => props.initialRowHeight,
  (newValue) => {
    lineHeight.value = newValue;
  }
);

watch(
  () => props.initialVisibleColumns,
  (newValue) => {
    selectedColumns.value = [...newValue];
  },
  { deep: true }
);

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
 * 切换自定义列下拉菜单显示状态
 */
const toggleColumnConfigDropdown = () => {
  showColumnConfigDropdown.value = !showColumnConfigDropdown.value;
};

/**
 * 切换列的显示/隐藏
 * 必须至少保留一项，当只剩最后一项时禁用取消操作
 */
const toggleColumn = (column) => {
  const index = selectedColumns.value.indexOf(column);
  if (index > -1) {
    // 尝试取消选中
    // 如果只剩一项，不允许取消
    if (selectedColumns.value.length <= 1) {
      return;
    }
    selectedColumns.value.splice(index, 1);
  } else {
    // 添加选中
    selectedColumns.value.push(column);
  }
  // 通知父组件列配置已更改
  emit("columnConfig", [...selectedColumns.value]);
};

/**
 * 检查列是否可以被取消选中
 */
const canToggleColumn = (column) => {
  const isSelected = selectedColumns.value.includes(column);
  // 如果未选中，可以选中
  if (!isSelected) {
    return true;
  }
  // 如果已选中，只有当选中项大于1时才能取消
  return selectedColumns.value.length > 1;
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (!event.target.closest(".line-height-config")) {
    showLineHeightDropdown.value = false;
  }
  if (!event.target.closest(".column-config")) {
    showColumnConfigDropdown.value = false;
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

.line-height-config,
.column-config {
  position: relative;
}

.line-height-dropdown,
.column-config-dropdown {
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
  position: relative;
  padding: 8px 16px;
  padding-right: 40px;
  cursor: pointer;
  font-size: 14px;
  color: #66666c;
  transition: background-color 0.2s;
}

.dropdown-option:hover:not(.disabled) {
  background-color: #f5f7fa;
}

.dropdown-option.checked {
  color: #409eff;
  font-weight: 500;
}

.dropdown-option.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dropdown-option.disabled:hover {
  background-color: transparent;
}

.dropdown-option.checked::after {
  background-color: #409eff;
  background-repeat: no-repeat;
  content: "";
  height: 12px;
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  background-position: 50% center;
  border-right: none;
  border-top: none;
  $svg-url: "data:image/svg+xml;utf8,%3Csvg%20class%3D%27icon%27%20width%3D%27200%27%20height%3D%27200%27%20viewBox%3D%270%200%201024%201024%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cpath%20fill%3D%27currentColor%27%20d%3D%27M406.656%20706.944L195.84%20496.256a32%2032%200%2010-45.248%2045.248l256%20256%20512-512a32%2032%200%2000-45.248-45.248L406.592%20706.944z%27%3E%3C/path%3E%3C/svg%3E";
  mask: url(#{$svg-url}) 0% 0% / 100% 100% no-repeat;
  -webkit-mask: url(#{$svg-url}) 0% 0% / 100% 100% no-repeat;
}
</style>
