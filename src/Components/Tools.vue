<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>
    <el-form
      :model="formData"
      ref="formRef"
      label-position="top"
      class="settings-form"
    >
      <CodeEditor v-model="codeContent"></CodeEditor>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import CodeEditor from "./CodeEditor.vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const formRef = ref();
const formData = reactive({
  // 工具页面的数据
});

// CodeEditor 的内容
const codeContent = ref("");

// 工具页面的方法可以在这里添加
</script>

<style lang="scss" scoped>
.setting_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.settings-form {
  width: 100%;
}

.tools-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
