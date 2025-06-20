<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>

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
          />
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

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

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

  try {
    loading.value = true;
    localStorage.setItem("deepseek_api_key", formData.apiKey.trim());
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
</style>
