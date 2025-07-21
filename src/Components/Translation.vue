<template>
  <div class="translation_group">
    <h2 class="title">{{ title }}</h2>
    <el-form
      :model="formData"
      ref="formRef"
      label-position="top"
      class="translation-form"
    >
      <el-form-item label="EN Copywriting" prop="content">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item>
        <div class="button-container">
          <el-button type="primary" @click="handleTranslate" :loading="loading">
            Translate
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import CodeEditor from "./CodeEditor.vue";
import { translate } from "../requests/lokalise";
import { ElMessage } from "element-plus";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const codeContent = ref("");
const loading = ref(false);
const formRef = ref();
const formData = reactive({
  // 国际化翻译页面的数据
});

const handleTranslate = async () => {
  if (!codeContent.value) {
    ElMessage.error("Please Enter the EN Copywriting");
    return;
  }

  loading.value = true;
  try {
    const data = await translate(codeContent.value);
    console.log(data);
    ElMessage.success("Translation completed successfully");
  } catch (error) {
    console.error("Translation error:", error);
    ElMessage.error(
      error.message ||
        "Translation failed. Please check your API key and settings."
    );
  } finally {
    loading.value = false;
  }
}; // 国际化翻译页面的方法可以在这里添加
</script>

<style lang="scss" scoped>
.translation_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.translation-form {
  width: 100%;
}

.translation-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
}

.CodeEditor {
  width: 100%;
}

.button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
