<template>
  <div class="autocomplete-wrapper">
    <el-input
      :model-value="modelValue"
      :placeholder="placeholder"
      @update:model-value="handleUpdate"
      @blur="handleBlur"
      @focus="handleFocus"
      @input="handleInput"
      @keydown="handleKeyDown"
      :clearable="clearable"
      ref="inputRef"
    />
    <span
      v-if="suggestionText"
      class="autocomplete-suggestion"
      :style="suggestionStyle"
    >
      {{ suggestionText }}
    </span>
    <span ref="measureRef" class="text-measure">{{ modelValue }}</span>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useAutocomplete } from "../../composables/Autocomplete/useAutocomplete.js";

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
    default: "2582110965ade9652de217.13653519",
  },
});

const emit = defineEmits(["update:modelValue", "blur", "focus"]);

const inputRef = ref(null);
const measureRef = ref(null);

// 使用自动补全 composable
const {
  suggestionText,
  suggestionStyle,
  handleInput: handleAutocompleteInput,
  handleKeyDown: handleAutocompleteKeyDown,
  clearSuggestion,
  setMeasureRef,
  updateSuggestionPosition,
} = useAutocomplete({
  fetchSuggestions: props.fetchSuggestions,
  getProjectId: props.getProjectId,
  debounce: props.debounce,
  defaultProjectId: props.defaultProjectId,
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

// 监听建议文本变化，更新位置
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
  clearSuggestion();
  emit("blur", event);
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
}
</style>
