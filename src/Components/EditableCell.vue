<template>
  <div>
    <div class="cell-content" v-if="!isEditing" @click="$emit('enterEdit')">
      {{ value }}
    </div>
    <div class="cell-edit" v-else>
      <el-input v-model="localValue" @focus="isEditing = true" @blur="handleBlur" @keydown.enter="handleEnter"
        @keydown.esc="handleEscape" ref="inputRef" class="edit-input" />
      <el-button type="primary" size="small" @click="handleSave" class="save-button">
        {{ t('common.save') }}
      </el-button>
      <el-button size="small" @click="handleCancel" class="cancel-button">
        {{ t('common.cancel') }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();

const props = defineProps({
  value: {
    type: String,
    default: "",
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["enterEdit", "exitEdit", "update:value", "save"]);

const localValue = ref(props.value);
const inputRef = ref();
const isSaving = ref(false);

// 监听props.value变化，同步到localValue
watch(
  () => props.value,
  (newValue) => {
    localValue.value = newValue;
  }
);

// 监听编辑状态变化，自动聚焦输入框
watch(
  () => props.isEditing,
  async (newValue) => {
    if (newValue) {
      await nextTick();
      inputRef.value?.focus();
    }
  }
);

const handleSave = () => {
  if (isSaving.value) return; // 防止重复调用
  isSaving.value = true;
  emit("update:value", localValue.value);
  emit("save"); // 发出保存事件
  emit("exitEdit");
  setTimeout(() => {
    isSaving.value = false;
  }, 100);
};

const handleEnter = (event) => {
  event.preventDefault(); // 阻止默认行为
  handleSave();
};

const handleBlur = () => {
  if (!isSaving.value) {
    handleSave();
  }
};

const handleEscape = (event) => {
  // 彻底阻止事件传播
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  handleCancel();
  return false;
};

const handleCancel = () => {
  localValue.value = props.value; // 恢复原值
  emit("exitEdit");
};
</script>

<style lang="scss" scoped>
.cell-content {
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.2s;
  height: 50px;
  display: flex;
  align-items: center;
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
}

.cell-edit {
  width: 100%;
  padding: 0;
  height: 30px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-input {
  flex: 1;
  height: 30px;
}

.save-button,
.cancel-button {
  flex-shrink: 0;
  margin-left: 0px;
  height: 30px;
}

.edit-input .el-input__wrapper {
  box-shadow: none;
  border: 1px solid #409eff;
  background-color: #ffffff;
  border-radius: 4px;
  padding: 0;
  height: 30px;
  box-sizing: border-box;
}

.edit-input .el-input__inner {
  padding: 0 11px;
  font-size: 14px;
  height: 30px;
  border: none;
  outline: none;
  box-sizing: border-box;
}
</style>
