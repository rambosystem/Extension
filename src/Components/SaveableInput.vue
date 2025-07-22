<template>
  <div class="input_container">
    <el-input type="text" :model-value="modelValue" :placeholder="placeholder" @input="handleInput" @blur="handleBlur"
      @focus="handleFocus" />
    <el-button v-show="isEditing" type="primary" @click="handleSaveClick" :loading="loading">
      {{ saveButtonText }}
    </el-button>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();

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

// 核心状态
const originalValue = ref(props.modelValue || "");
const isEditing = ref(false);
const isSaving = ref(false);
const saveJustFailed = ref(false);

// 监听外部值变化，更新原始值（仅在非编辑状态）
watch(
  () => props.modelValue,
  (newValue) => {
    // 只有在非编辑状态时才更新原始值
    if (!isEditing.value) {
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

/**
 * 处理用户输入
 */
const handleInput = (value) => {
  // 用户开始新的输入，重置保存失败标志
  if (saveJustFailed.value) {
    saveJustFailed.value = false;
  }

  emit("update:modelValue", value);

  // 检查是否有实际变化，决定是否进入编辑状态
  const hasChangedNow = value.trim() !== originalValue.value.trim();

  if (hasChangedNow && !isEditing.value) {
    isEditing.value = true;
  } else if (!hasChangedNow && isEditing.value) {
    isEditing.value = false;
  }
};

/**
 * 处理获得焦点
 */
const handleFocus = () => {
  // 焦点时不自动进入编辑状态，只有实际修改时才进入
};

/**
 * 处理失去焦点 - 退出编辑状态
 */
const handleBlur = () => {
  // 如果正在保存，不处理失焦
  if (isSaving.value) return;

  // 如果保存刚刚失败，不处理失焦（给用户时间继续编辑）
  if (saveJustFailed.value) return;

  // 延迟处理，给用户时间点击保存按钮
  setTimeout(() => {
    if (isEditing.value && !isSaving.value && !saveJustFailed.value) {
      // 恢复到原始值
      emit("update:modelValue", originalValue.value);
      // 退出编辑状态
      isEditing.value = false;
    }
  }, 200);
};

/**
 * 处理保存点击
 */
const handleSaveClick = () => {
  if (!isEditing.value) return;

  const currentValue = props.modelValue || "";

  // 检查是否为空
  if (!currentValue.trim()) {
    ElMessage.error(t("settings.pleaseEnterValue"));
    return;
  }

  // 检查是否有变化
  if (currentValue.trim() === originalValue.value.trim()) {
    // 没有变化，直接退出编辑状态
    isEditing.value = false;
    return;
  }

  isSaving.value = true;

  emit("save", {
    value: currentValue,
    onSuccess: () => {
      // 保存成功：更新原始值，退出编辑状态，重置保存失败标志
      originalValue.value = currentValue;
      isEditing.value = false;
      isSaving.value = false;
      saveJustFailed.value = false;
      ElMessage.success(t("settings.saveSuccessful"));
    },
    onError: (errorMessage) => {
      // 保存失败：保持编辑状态，显示错误信息，设置保存失败标志
      isSaving.value = false;
      saveJustFailed.value = true;
      ElMessage.error(errorMessage || t("settings.saveFailed"));

      // 3秒后自动重置保存失败标志，允许失焦退出编辑
      setTimeout(() => {
        if (saveJustFailed.value) {
          saveJustFailed.value = false;
        }
      }, 3000);
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
    width: 100%;
  }

  .el-button {
    min-width: 64px;
  }
}
</style>
