<template>
  <div class="input_container">
    <el-input
      type="text"
      :model-value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      @blur="handleBlur"
    />
    <el-button
      v-show="showSaveButton"
      type="primary"
      @click="handleSaveClick"
      :loading="loading"
    >
      {{ saveButtonText }}
    </el-button>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  saveButtonText: {
    type: String,
    default: "Save",
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "save"]);

// 内部状态
const originalValue = ref(props.modelValue || "");
const isSaving = ref(false);
const userHasInteracted = ref(false); // 跟踪用户是否有过交互

// 计算按钮是否显示
const showSaveButton = computed(() => {
  const currentValue = props.modelValue || "";
  const hasChanged = currentValue.trim() !== originalValue.value.trim();
  return hasChanged && !isSaving.value && userHasInteracted.value;
});

// 监听外部值变化，在用户未交互时更新原始值
watch(
  () => props.modelValue,
  (newValue) => {
    // 如果用户还没有交互过，就更新原始值
    if (!userHasInteracted.value) {
      originalValue.value = newValue || "";
    }
  },
  { immediate: true }
);

// 监听loading状态
watch(
  () => props.loading,
  (newLoading) => {
    isSaving.value = newLoading;
  }
);

const handleInput = (value) => {
  emit("update:modelValue", value);
  userHasInteracted.value = true; // 用户有过交互
};

const handleBlur = () => {
  // 如果正在保存，不执行重置逻辑
  if (isSaving.value) return;

  // 延迟重置，给用户时间点击保存按钮
  setTimeout(() => {
    if (showSaveButton.value && !isSaving.value) {
      // 恢复到原始值
      emit("update:modelValue", originalValue.value);
      // 重置用户交互标志
      userHasInteracted.value = false;
    }
  }, 200);
};

const handleSaveClick = () => {
  isSaving.value = true;
  emit("save", {
    value: props.modelValue,
    onSuccess: () => {
      originalValue.value = props.modelValue;
      userHasInteracted.value = false; // 保存成功后重置交互标志
      isSaving.value = false;
    },
    onError: () => {
      isSaving.value = false;
    },
  });
};
</script>

<style lang="scss" scoped>
.input_container {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;

  .el-input {
    flex: 1;
    min-width: 0;
  }
}
</style>
