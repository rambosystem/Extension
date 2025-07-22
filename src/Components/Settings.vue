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
        <SaveableInput
          v-model="formData.apiKey"
          label="API Key for DeepSeek"
          placeholder="API Key for DeepSeek"
          @save="handleSaveAPIKey"
          :loading="loading"
        />
      </el-form-item>
      <el-form-item label="Lokalise Project Upload URL" prop="uploadUrl">
        <SaveableInput
          v-model="formData.uploadUrl"
          label="Lokalise Project Upload URL"
          placeholder="Lokalise Project Upload URL"
          @save="handleSaveLokaliseURL"
          :loading="loading"
        />
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
import { DEFAULT_TRANSLATION_PROMPT } from "../config/prompts.js";
import SaveableInput from "./SaveableInput.vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const deepseekApiKey = ref("");
const codeContent = ref(DEFAULT_TRANSLATION_PROMPT);
const formRef = ref();
const loading = ref(false);
const dialogVisible = ref(false);

const formData = reactive({
  apiKey: "",
  uploadUrl: "",
});

const handleClearLocalStorage = () => {
  dialogVisible.value = true;
};

const handleClearLocalStorageConfirm = () => {
  localStorage.clear();
  dialogVisible.value = false;
  ElMessage.success("Clear Local Storage Success");
};

const handleSaveAPIKey = async (saveData) => {
  const { value, onSuccess, onError } = saveData;

  if (!value?.trim()) {
    ElMessage.error("Please enter API Key");
    onError();
    return;
  }

  try {
    loading.value = true;

    // 检查apikey是否合法
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${value.trim()}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: "Hello, world!" }],
        }),
      }
    );

    if (!response.ok) {
      ElMessage.error("API Key is invalid");
      onError();
      return;
    }

    deepseekApiKey.value = value.trim();
    localStorage.setItem("deepseek_api_key", deepseekApiKey.value);
    formData.apiKey = value.trim();
    ElMessage.success("Save success");
    onSuccess();
  } catch (error) {
    ElMessage.error("API Key validation failed");
    onError();
  } finally {
    loading.value = false;
  }
};

const handleSaveLokaliseURL = async (saveData) => {
  const { value, onSuccess, onError } = saveData;

  if (!value?.trim()) {
    ElMessage.error("Please enter Lokalise Project Upload URL");
    onError();
    return;
  }

  try {
    loading.value = true;
    localStorage.setItem("lokalise_upload_url", value.trim());
    formData.uploadUrl = value.trim();
    ElMessage.success("Save success");
    onSuccess();
  } catch (error) {
    ElMessage.error("Save failed");
    onError();
  } finally {
    loading.value = false;
  }
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
  }

  const savedPrompt = localStorage.getItem("deepseek_prompt");
  if (savedPrompt) {
    codeContent.value = savedPrompt;
  }

  const savedUploadUrl = localStorage.getItem("lokalise_upload_url");
  if (savedUploadUrl) {
    formData.uploadUrl = savedUploadUrl;
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
