<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>

    <el-form :model="formData" ref="formRef" label-position="top" class="settings-form">
      <el-form-item label="API Key" prop="apiKey">
        <div class="input_container">
          <el-input type="text" v-model="formData.apiKey" placeholder="API Key for DeepSeek" />
        </div>
      </el-form-item>
      <el-form-item label="Prompt" prop="prompt">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item>
        <div class="button-container">
          <el-button type="primary" @click="handleSave" :loading="loading">
            Save
          </el-button>
        </div>
      </el-form-item>

    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import CodeEditor from './CodeEditor.vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const codeContent = ref(`1.角色定位：你是Pacvue的一名专业广告文案翻译师，擅长广告领域基础知识以及Pacvue广告系统，目标是帮助Pacvue生成专业的广告国际化文案。
2.任务描述：翻译英文文案，并生成对应的中文以及日文文案。
3.需要翻译的文本如下,每一行分别代表需要翻译的文案：
""[Content]""
4.请以 CSV 格式输出，每列内容用 \`,\` 分隔，如果存在多行数据请进行换行处理,示例：
"原英文文案","翻译完成的中文文案","翻译完成的日文文案"
"原英文文案","翻译完成的中文文案","翻译完成的日文文案"
***输出结果中请不要携带示例文案***
***请检查英文文案中的拼写错误，如果存在拼写错误，请在输出结果中修正***
***请严格遵循 CSV 格式，**用逗号 \`,\` 分隔，并确保内容用 \`""\` 包裹**，避免格式错乱，不要使用代码块 \`\`\` 进行包裹，仅输出 CSV 纯文本格式***
***如果文案中存在特殊字符请保留原有格式，例如",",".","?","\\n","\\t","{0}","{1}"等等***
***中文以及日文翻译中去除{n}占位符前后的空格***`);
const formRef = ref();
const loading = ref(false);

const formData = reactive({
  apiKey: "",
});

const handleSave = async () => {
  if (!formData.apiKey?.trim()) {
    ElMessage.error("Please enter API Key");
    return;
  }

  if (!codeContent.value?.trim()) {
    ElMessage.error("Please enter Prompt");
    return;
  }

  try {
    loading.value = true;
    localStorage.setItem("deepseek_api_key", formData.apiKey.trim());
    localStorage.setItem("deepseek_prompt", codeContent.value.trim());
    ElMessage.success("Save success");
  } catch (error) {
    console.error("Save failed:", error);
    ElMessage.error("Save failed, please try again");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const savedApiKey = localStorage.getItem("deepseek_api_key");
  if (savedApiKey) {
    formData.apiKey = savedApiKey;
  }

  const savedPrompt = localStorage.getItem("deepseek_prompt");
  if (savedPrompt) {
    codeContent.value = savedPrompt;
  }
});
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

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}

/* CodeEditor 包装容器样式 */
.CodeEditor {
  width: 100%;
}

/* 按钮容器样式 - 右对齐 */
.button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

/* CodeEditor 样式调整 - 更好的解决方案 */
:deep(.el-form-item__content) {
  .cm-editor {
    width: 100%;
  }
}
</style>
