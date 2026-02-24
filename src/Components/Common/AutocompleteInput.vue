<template>
  <div class="autocomplete-wrapper">
    <el-input :model-value="modelValue" :placeholder="placeholder" @update:model-value="handleUpdate" @blur="handleBlur"
      @focus="handleFocus" @input="handleInput" @keydown="handleKeyDown" :clearable="clearable" ref="inputRef" />
    <span v-if="suggestionText && modelValue" class="autocomplete-suggestion" :style="suggestionStyle">
      {{ suggestionText }}
    </span>
    <span ref="measureRef" class="text-measure">{{ modelValue }}</span>
    <!-- 下拉菜单 -->
    <div v-if="showDropdown && showDropdownMenu && dropdownSuggestions.length > 0" class="autocomplete-dropdown"
      ref="dropdownRef">
      <div v-for="(suggestion, index) in dropdownSuggestions" :key="index" class="dropdown-item"
        :class="{ 'is-selected': index === selectedIndex }" @click="handleSelectSuggestion(suggestion)"
        @mouseenter="selectedIndex = index">
        {{ suggestion }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useAutocomplete } from "../../lokalise/composables/Autocomplete/useAutocomplete.js";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  // 自动补全配置
  fetchSuggestions: {
    type: Function,
    default: null,
  },
  fetchSuggestionsList: {
    type: Function,
    default: null,
  },
  getProjectId: {
    type: Function,
    default: null,
  },
  debounce: {
    type: Number,
    default: 300,
  },
  defaultProjectId: {
    type: String,
    default: null,
  },
  showDropdown: {
    type: Boolean,
    default: false,
  },
  dropdownLimit: {
    type: Number,
    default: 10,
  },
});

const emit = defineEmits(["update:modelValue", "blur", "focus"]);

const inputRef = ref(null);
const measureRef = ref(null);
const dropdownRef = ref(null);

// 使用自动补全 composable
const {
  suggestionText,
  suggestionStyle,
  dropdownSuggestions,
  showDropdownMenu,
  selectedIndex,
  handleInput: handleAutocompleteInput,
  handleKeyDown: handleAutocompleteKeyDown,
  clearSuggestion,
  setMeasureRef,
  updateSuggestionPosition,
  selectSuggestion,
} = useAutocomplete({
  fetchSuggestions: props.fetchSuggestions,
  fetchSuggestionsList: props.fetchSuggestionsList,
  getProjectId: props.getProjectId,
  debounce: props.debounce,
  defaultProjectId: props.defaultProjectId,
  showDropdown: props.showDropdown,
  dropdownLimit: props.dropdownLimit,
});

// 设置测量元素引用
onMounted(() => {
  nextTick(() => {
    setMeasureRef(measureRef.value);
  });
});

onUnmounted(() => {
  clearSuggestion();
});

// 监听输入值变化，更新建议位置
watch(
  () => props.modelValue,
  (newValue) => {
    updateSuggestionPosition(newValue);
  }
);

// 监听建议文本变化，更新位�?
watch(
  () => suggestionText.value,
  () => {
    updateSuggestionPosition(props.modelValue);
  }
);

/**
 * 处理输入更新
 */
const handleUpdate = (value) => {
  emit("update:modelValue", value);
};

/**
 * 处理输入事件
 */
const handleInput = (value) => {
  handleUpdate(value);
  handleAutocompleteInput(value, handleUpdate);
};

/**
 * 处理键盘事件
 */
const handleKeyDown = (event) => {
  handleAutocompleteKeyDown(event, props.modelValue, handleUpdate);
};

/**
 * 处理失焦事件
 */
const handleBlur = (event) => {
  // 延迟清除，以便点击下拉菜单项时能够触�?
  setTimeout(() => {
    clearSuggestion();
  }, 200);
  emit("blur", event);
};

/**
 * 处理选择下拉菜单�?
 */
const handleSelectSuggestion = (suggestion) => {
  selectSuggestion(suggestion, handleUpdate);
};

/**
 * 处理获得焦点事件
 */
const handleFocus = (event) => {
  emit("focus", event);
};
</script>

<style lang="scss" scoped>
.autocomplete-wrapper {
  position: relative;
  width: 100%;

  .autocomplete-suggestion {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #c0c4cc;
    font-size: 14px;
    font-family: inherit;
    font-weight: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - 22px);
    z-index: 1;
  }

  :deep(.el-input__inner) {
    position: relative;
    z-index: 2;
    background-color: transparent;
  }

  // 确保placeholder正常显示
  :deep(.el-input__inner::placeholder) {
    color: #c0c4cc;
    opacity: 1;
  }

  // 创建一个测量元素来获取输入文本宽度
  .text-measure {
    position: absolute;
    visibility: hidden;
    white-space: pre;
    font-size: 14px;
    font-family: inherit;
    font-weight: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    padding: 0;
    margin: 0;
    border: none;
    top: 0;
    left: 11px;
    height: 0;
    overflow: hidden;
    pointer-events: none;
  }

  // 下拉菜单样式
  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;

    .dropdown-item {
      padding: 8px 12px;
      font-size: 14px;
      color: #606266;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover,
      &.is-selected {
        background-color: #f5f7fa;
        color: #409eff;
      }

      &:first-child {
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
      }

      &:last-child {
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
      }
    }
  }
}
</style>

