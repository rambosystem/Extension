<template>
  <div class="setting_group">
    <h2 class="title">Lokalise Settings</h2>
    <el-form
      :model="formData"
      ref="formRef"
      label-position="top"
      class="settings-form"
    >
      <el-form-item label="API Key" prop="apiKey">
        <div class="input_container">
          <el-input
            type="text"
            v-model="formData.apiKey"
            placeholder="API Key for DeepSeek"
            @input="onApiKeyChange"
          />
          <el-button
            v-show="showApiKeySaveBtn"
            type="primary"
            @click="handleSaveAPIKey"
            :loading="loading"
          >
            Save
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="Lokalise Project Upload URL" prop="uploadUrl">
        <div class="input_container">
          <el-input
            type="text"
            v-model="formData.uploadUrl"
            @input="onUrlChange"
          />
          <el-button
            v-show="showUrlSaveBtn"
            type="primary"
            @click="handleSaveLokaliseURL"
            :loading="loading"
          >
            Save
          </el-button>
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
    <h2 class="title">Advanced Settings</h2>
    <el-form
      :model="formData"
      ref="formRef"
      label-position="top"
      class="settings-form"
    >
      <el-form-item label="Clear Local Storage" label-position="left">
        <div class="localStorageClear">
          <el-button type="primary" @click="handleClearLocalStorage">
            Clear
          </el-button>
        </div>
        <el-dialog
          v-model="dialogVisible"
          title="Clear Local Storage"
          width="30%"
          align-center
        >
          <span>Are you sure you want to clear local storage?</span>
          <template #footer>
            <el-button @click="dialogVisible = false">Cancel</el-button>
            <el-button type="primary" @click="handleClearLocalStorageConfirm">
              Confirm
            </el-button>
          </template>
        </el-dialog>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElDialog } from "element-plus";
import CodeEditor from "./CodeEditor.vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const deepseekApiKey = ref("");
const codeContent =
  ref(`1.角色定位：你是Pacvue的一名专业广告文案翻译师，擅长广告领域基础知识以及Pacvue广告系统，目标是帮助Pacvue生成专业的广告国际化文案。
2.任务描述：翻译英文文案，并生成对应的中文以及日文文案。
3.请以 CSV 格式输出，每列内容用 \`,\` 分隔，如果存在多行数据请进行换行处理,示例：
"原英文文案","翻译完成的中文文案","翻译完成的日文文案"(请不要携带示例文案)
"原英文文案","翻译完成的中文文案","翻译完成的日文文案"(请不要携带示例文案)
"原英文文案","翻译完成的中文文案","翻译完成的日文文案"(请不要携带示例文案)
***输出结果中请不要携带示例文案***
***请检查英文文案中的拼写错误，如果存在拼写错误，请在输出结果中修正***
***请严格遵循 CSV 格式，**用逗号 \`,\` 分隔，并确保内容用 \`""\` 包裹**，避免格式错乱，不要使用代码块 \`\`\` 进行包裹，仅输出 CSV 纯文本格式***
***如果文案中存在特殊字符请保留原有格式，例如",",".","?","\\n","\\t","{0}","{1}"等等***
***中文以及日文翻译中去除{n}占位符前后的空格***`);
const formRef = ref();
const loading = ref(false);
const dialogVisible = ref(false);

// 控制按钮可见性
const showApiKeySaveBtn = ref(false);
const showUrlSaveBtn = ref(false);

// 存储原始值用于比较
const originalApiKey = ref("");
const originalUrl = ref("");

const formData = reactive({
  apiKey: "",
  uploadUrl: "",
});

// 监听输入变化
const onApiKeyChange = () => {
  showApiKeySaveBtn.value = formData.apiKey.trim() !== originalApiKey.value;
};

const onUrlChange = () => {
  showUrlSaveBtn.value = formData.uploadUrl.trim() !== originalUrl.value;
};

const handleClearLocalStorage = () => {
  dialogVisible.value = true;
};

const handleClearLocalStorageConfirm = () => {
  localStorage.clear();
  dialogVisible.value = false;
  ElMessage.success("Clear Local Storage Success");
};

const handleSaveAPIKey = async () => {
  if (!formData.apiKey?.trim()) {
    ElMessage.error("Please enter API Key");
    return;
  }
  // 检查apikey是否合法
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${formData.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Hello, world!" }],
    }),
  });
  if (!response.ok) {
    ElMessage.error("API Key is invalid");
    return;
  }
  deepseekApiKey.value = formData.apiKey.trim();
  localStorage.setItem("deepseek_api_key", deepseekApiKey.value);
  originalApiKey.value = formData.apiKey.trim();
  showApiKeySaveBtn.value = false;
  ElMessage.success("Save success");
};

const handleSaveLokaliseURL = async () => {
  if (!formData.uploadUrl?.trim()) {
    ElMessage.error("Please enter Lokalise Project Upload URL");
    return;
  }
  localStorage.setItem("lokalise_upload_url", formData.uploadUrl.trim());
  originalUrl.value = formData.uploadUrl.trim();
  showUrlSaveBtn.value = false;
  ElMessage.success("Save success");
};
const handleSave = async () => {
  if (!codeContent.value?.trim()) {
    ElMessage.error("Please enter Prompt");
    return;
  }

  try {
    loading.value = true;
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
    deepseekApiKey.value = savedApiKey;
    formData.apiKey = savedApiKey; // 🔧 修复：同步到表单显示
    originalApiKey.value = savedApiKey; // 初始化原始值
  }

  const savedPrompt = localStorage.getItem("deepseek_prompt");
  if (savedPrompt) {
    codeContent.value = savedPrompt;
  }

  const savedUploadUrl = localStorage.getItem("lokalise_upload_url");
  if (savedUploadUrl) {
    formData.uploadUrl = savedUploadUrl;
    originalUrl.value = savedUploadUrl; // 初始化原始值
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
.localStorageClear {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
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

:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
}
</style>
