<template>
  <div class="popup-text-input-wrapper" ref="wrapperRef">
    <div class="popup-text-input-container" :class="{ active: showPopup, 'has-value': modelValue }"
      @click="handleContainerClick">
      <span v-if="label" class="filter-label">{{ label }}</span>
      <span v-if="label" class="filter-separator">|</span>
      <div v-if="conditions && conditions.length > 0" class="filter-condition-selector"
        @click.stop="showConditionDropdown = !showConditionDropdown">
        <span class="condition-text">{{ conditionText }}</span>
        <el-icon class="condition-icon">
          <ArrowDown />
        </el-icon>
        <div v-if="showConditionDropdown" class="condition-dropdown" @click.stop>
          <div v-for="condition in conditions" :key="condition.value" class="condition-option"
            :class="{ active: currentCondition === condition.value }" @click="selectCondition(condition.value)">
            {{ condition.label }}
          </div>
        </div>
      </div>
      <input :value="displayValue" type="text" class="filter-text-input" :placeholder="placeholder" readonly
        @focus="showPopup = true" />
      <el-icon v-if="modelValue" class="clear-icon" @click.stop="handleClear">
        <CircleClose />
      </el-icon>
    </div>
    <div v-if="showPopup" class="popup-text-input-popup" @click.stop>
      <el-input :model-value="modelValue" @update:model-value="handleInputUpdate" type="textarea" :rows="6"
        :placeholder="popupPlaceholder" class="popup-textarea" @blur="handleBlur" />
    </div>
  </div>
</template>

<script setup>
/**
 * PopupTextInput - 弹出式文本输入组件
 * 
 * 一个通用的文本输入组件，支持：
 * - 点击输入框弹出多行文本编辑器（textarea）
 * - 可选的条件选择器（如：Contains、Equals 等）
 * - 多值输入（支持换行或逗号分隔）
 * - 多值显示格式化（如："N Key Names"）
 * - 清除功能
 * 
 * @component
 * @example
 * <PopupTextInput
 *   v-model="keyName"
 *   label="Key Name"
 *   placeholder="Enter key name"
 *   popup-placeholder="Enter multiple key names (one per line or comma separated)"
 *   :conditions="filterConditions"
 *   :condition="currentCondition"
 *   multiple-display-format="{count} Key Names"
 *   @update:condition="handleConditionChange"
 *   @clear="handleClear"
 * />
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { ArrowDown, CircleClose } from "@element-plus/icons-vue";

const props = defineProps({
  /**
   * 输入框的值（v-model）
   * @type {String}
   * @default ""
   */
  modelValue: {
    type: String,
    default: "",
  },
  /**
   * 输入框标签（显示在输入框左侧，可选）
   * @type {String}
   * @default ""
   */
  label: {
    type: String,
    default: "",
  },
  /**
   * 输入框占位符（显示在输入框中）
   * @type {String}
   * @default ""
   */
  placeholder: {
    type: String,
    default: "",
  },
  /**
   * 弹出文本域的占位符（显示在弹出窗口中）
   * @type {String}
   * @default ""
   */
  popupPlaceholder: {
    type: String,
    default: "",
  },
  /**
   * 条件选项列表
   * 格式：[{ label: "Contains", value: "contains" }, ...]
   * @type {Array<{label: String, value: String}>}
   * @default []
   */
  conditions: {
    type: Array,
    default: () => [],
  },
  /**
   * 当前选中的条件值
   * @type {String}
   * @default ""
   */
  condition: {
    type: String,
    default: "",
  },
  /**
   * 多值显示格式字符串
   * 当输入多个值时，使用此格式显示。支持 {count} 占位符
   * 例如："{count} Key Names" 会显示为 "3 Key Names"
   * @type {String}
   * @default ""
   */
  multipleDisplayFormat: {
    type: String,
    default: "",
  },
});

/**
 * 组件事件
 * @typedef {Object} PopupTextInputEmits
 * @property {String} update:modelValue - 输入值变化时触发，参数为新值
 * @property {String} update:condition - 条件选择变化时触发，参数为新条件值
 * @property {void} clear - 清除按钮点击时触发
 */
const emit = defineEmits(["update:modelValue", "update:condition", "clear"]);

const wrapperRef = ref(null);
const showPopup = ref(false);
const showConditionDropdown = ref(false);
const currentCondition = ref(props.condition || (props.conditions.length > 0 ? props.conditions[0].value : ""));

/**
 * 计算当前条件的显示文本
 * @returns {String} 条件的标签文本
 */
const conditionText = computed(() => {
  if (!props.conditions || props.conditions.length === 0) return "";
  const condition = props.conditions.find((c) => c.value === currentCondition.value);
  return condition ? condition.label : (props.conditions[0]?.label || "");
});

/**
 * 计算输入框的显示值
 * - 如果为空，返回空字符串
 * - 如果只有一个值，直接显示该值
 * - 如果有多个值，使用 multipleDisplayFormat 格式化显示
 * 
 * 支持换行符（\n）和逗号（,）作为分隔符
 * @returns {String} 格式化后的显示文本
 */
const displayValue = computed(() => {
  if (!props.modelValue) return "";

  // 计算有效的值数量（过滤空行和空白）
  const values = props.modelValue
    .split(/[\n,]/)
    .map((val) => val.trim())
    .filter((val) => val.length > 0);

  if (values.length === 0) return "";
  if (values.length === 1) return values[0];

  // 多个值时显示格式化的文本
  if (props.multipleDisplayFormat) {
    // 支持 {count} 占位符替换
    return props.multipleDisplayFormat.replace(/\{count\}/g, values.length);
  }
  return `${values.length} items`;
});

/**
 * 处理容器点击事件，打开弹出窗口
 */
const handleContainerClick = () => {
  showPopup.value = true;
  showConditionDropdown.value = false;
};

/**
 * 选择条件选项
 * @param {String} value - 条件的值
 */
const selectCondition = (value) => {
  currentCondition.value = value;
  showConditionDropdown.value = false;
  emit("update:condition", value);
};

/**
 * 处理文本域失焦事件
 * 延迟关闭弹窗，以便点击弹窗内部时不会立即关闭
 */
const handleBlur = () => {
  // 延迟关闭弹窗，以便点击弹窗内部时不会立即关闭
  setTimeout(() => {
    showPopup.value = false;
  }, 200);
};

/**
 * 处理清除按钮点击
 * 清空输入值并触发 clear 事件
 */
const handleClear = () => {
  emit("update:modelValue", "");
  emit("clear");
  showPopup.value = false;
};

/**
 * 处理输入值更新
 * @param {String} value - 新的输入值
 */
const handleInputUpdate = (value) => {
  emit("update:modelValue", value);
};

/**
 * 处理点击外部区域事件，关闭弹出窗口和条件下拉框
 * @param {Event} event - 点击事件对象
 */
const handleClickOutside = (event) => {
  if (wrapperRef.value) {
    const element = wrapperRef.value;
    if (element && !element.contains(event.target)) {
      showPopup.value = false;
      showConditionDropdown.value = false;
    }
  }
};

onMounted(() => {
  // 添加全局点击事件监听
  nextTick(() => {
    document.addEventListener("click", handleClickOutside);
  });
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style lang="scss" scoped>
.popup-text-input-wrapper {
  width: 100%;
  position: relative;
}

.popup-text-input-container {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 4px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 0 1px #dcdfe6 inset;

  &:hover {
    box-shadow: 0 0 0 1px #409eff inset;
  }

  &.active {
    box-shadow: 0 0 0 1px #409eff inset;
  }

  &.has-value {
    background-color: #f5f7fa;
  }
}

.filter-label {
  display: flex;
  font-size: 14px;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
}

.filter-separator {
  margin: 0 8px;
  color: #dcdfe6;
}

.filter-condition-selector {
  display: flex;
  align-items: center;
  margin-right: 8px;
  padding: 0 4px;
  position: relative;
  cursor: pointer;
}

.condition-text {
  font-size: 14px;
  color: #409eff;
  margin-right: 4px;
  white-space: nowrap;
}

.condition-icon {
  font-size: 12px;
  color: #409eff;
  transition: transform 0.2s;
}

.condition-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1002;
  min-width: 150px;
  max-height: 200px;
  overflow-y: auto;
}

.condition-option {
  padding: 8px 12px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }

  &.active {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

.filter-text-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #606266;
  background: transparent;
  cursor: pointer;

  &::placeholder {
    color: #c0c4cc;
  }
}

.clear-icon {
  font-size: 14px;
  color: #c0c4cc;
  cursor: pointer;
  margin-left: 8px;
  transition: color 0.2s;

  &:hover {
    color: #909399;
  }
}

.popup-text-input-popup {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: #ffffff;
  border: 1px solid #409eff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.popup-textarea {
  width: 100%;
  height: 100%;

  :deep(.el-textarea__inner) {
    font-family: inherit;
    resize: vertical;
    border: none;
    box-shadow: none;
    padding: 8px;

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE and Edge

    &::-webkit-scrollbar {
      display: none; // Chrome, Safari, Opera
    }
  }
}
</style>
