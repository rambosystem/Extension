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
          <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
          <el-button
            type="text"
            @click="showLastTranslation"
            v-if="lastTranslation"
          >
            Last Translation
          </el-button>
          <el-button type="primary" @click="handleTranslate" :loading="loading">
            Translate
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <!-- 使用El-dialog展示翻译结果, 结果使用El-table展示-->
    <!-- 提供导出CSV功能-->
    <el-dialog v-model="dialogVisible" title="Translation Result" width="50%">
      <el-form label-position="top">
        <el-form-item>
          <el-table :data="translationResult" style="width: 100%">
            <el-table-column prop="en" label="EN" />
            <el-table-column prop="cn" label="CN" />
            <el-table-column prop="jp" label="JP" />
          </el-table>
        </el-form-item>
        <el-form-item>
          <div class="dialog-button-container">
            <el-button type="primary" @click="exportCSV">Export CSV</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-dialog>
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
const dialogVisible = ref(false);
const translationResult = ref([]);
const lastTranslation = ref(null);
const formRef = ref();
const formData = reactive({
  // 国际化翻译页面的数据
});

const exportCSV = () => {
  // 将translationResult.value转换为CSV格式
  // 第一行是标题，第二行开始是数据，标题为key,en,cn,jp. 其中key==en
  const header = ["key", "en", "cn", "jp"];
  const csvContent = [
    header.join(","),
    ...translationResult.value.map((row) =>
      [
        row.en, // key == en
        row.en, // en
        row.cn, // cn
        row.jp, // jp
      ].map((value) => `"${value.replace(/"/g, '""')}"`)
    ), // 正确处理引号转义
  ].join("\n");

  // 添加 UTF-8 BOM 来解决中文乱码问题
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "translation_result.csv";
  a.click();
  URL.revokeObjectURL(url);
};

const showLastTranslation = () => {
  if (lastTranslation.value) {
    translationResult.value = [...lastTranslation.value];
    dialogVisible.value = true;
  }
};

const handleTranslate = async () => {
  if (!codeContent.value) {
    ElMessage.error("Please Enter the EN Copywriting");
    return;
  }

  loading.value = true;
  try {
    const data = await translate(codeContent.value);
    console.log("Raw API response:", data);
    ElMessage.success("Translation completed successfully");
    dialogVisible.value = true;

    //数据结果是"Dayparting Scheduler Template","时段排期模板","時間帯スケジューラーテンプレート"这种格式，需要将数据进行分割，并转换为数组
    //分为三列EN,CN,JP
    const lines = data
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    console.log("Parsed lines:", lines);

    translationResult.value = lines.map((line, index) => {
      // 使用正则表达式来正确解析 CSV 格式，处理包含逗号的字段
      const matches = line.match(/"([^"]*)","([^"]*)","([^"]*)"/);
      if (matches) {
        const [, en, cn, jp] = matches;
        console.log(`Line ${index + 1}:`, { en, cn, jp });
        return { en, cn, jp };
      } else {
        // 如果正则匹配失败，尝试简单的 split 方法
        const parts = line
          .split(",")
          .map((part) => part.replace(/"/g, "").trim());
        console.log(`Line ${index + 1} (fallback):`, parts);
        return {
          en: parts[0] || "",
          cn: parts[1] || "",
          jp: parts[2] || "",
        };
      }
    });

    console.log("Final translation result:", translationResult.value);

    // 保存当前翻译结果到 lastTranslation
    lastTranslation.value = JSON.parse(JSON.stringify(translationResult.value));
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
  gap: 12px;
  align-items: center;
}

/* Last Translation 按钮样式 */
.button-container .el-button--text {
  color: #409eff;
  font-size: 14px;
  padding: 0;
  height: auto;
  line-height: 1.5;
}

.button-container .el-button--text:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.dialog-button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}

/* 对话框表单样式 */
:deep(.el-dialog .el-form) {
  margin: 0;
}

:deep(.el-dialog .el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-dialog .el-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.el-dialog .el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

/* 加粗对话框标题 */
:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
}
</style>
