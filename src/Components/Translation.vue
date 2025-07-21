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
    <el-dialog v-model="dialogVisible" title="Translation Result" width="70%">
      <el-form label-position="top">
        <el-form-item>
          <el-table :data="translationResult" style="width: 100%" height="550">
            <el-table-column prop="en" label="EN">
              <template #default="{ row, $index }">
                <!-- 如果row.editing_en为true，则显示el-input并聚焦，否则显示row.en -->
                <div
                  class="en-content"
                  v-if="!row.editing_en"
                  @click="enterEditMode($index, 'en')"
                >
                  {{ row.en }}
                </div>
                <!--row.editing_en为true，则聚焦，失焦后更新row.en，并设置row.editing_en为false-->
                <div class="en-edit" v-else>
                  <el-input
                    v-model="row.en"
                    @blur="row.editing_en = false"
                    @focus="row.editing_en = true"
                  />
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="cn" label="CN">
              <template #default="{ row, $index }">
                <div
                  class="cn-content"
                  v-if="!row.editing_cn"
                  @click="enterEditMode($index, 'cn')"
                >
                  {{ row.cn }}
                </div>
                <div class="cn-edit" v-else>
                  <el-input
                    v-model="row.cn"
                    @blur="row.editing_cn = false"
                    @focus="row.editing_cn = true"
                  />
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="jp" label="JP">
              <template #default="{ row, $index }">
                <div
                  class="jp-content"
                  v-if="!row.editing_jp"
                  @click="enterEditMode($index, 'jp')"
                >
                  {{ row.jp }}
                </div>
                <div class="jp-edit" v-else>
                  <el-input
                    v-model="row.jp"
                    @blur="row.editing_jp = false"
                    @focus="row.editing_jp = true"
                  />
                </div>
              </template>
            </el-table-column>
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
import { ref, reactive, onMounted } from "vue";
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

// 从本地存储加载上次翻译结果
const loadLastTranslation = () => {
  const saved = localStorage.getItem("last_translation_result");
  if (saved) {
    try {
      lastTranslation.value = JSON.parse(saved);
    } catch (error) {
      console.error(
        "Failed to parse last translation from localStorage:",
        error
      );
      lastTranslation.value = null;
    }
  }
};

// 保存翻译结果到本地存储
const saveTranslationToLocal = (data) => {
  try {
    localStorage.setItem("last_translation_result", JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save translation to localStorage:", error);
    ElMessage.warning("Failed to save translation result to local storage");
  }
};

const exportCSV = () => {
  // 将translationResult.value转换为CSV格式
  // 第一行是标题，第二行开始是数据，标题为key,en,zh_CN,jp. 其中key==en
  const header = ["key", "en", "zh_CN", "jp"];
  const csvContent = [
    header.join(","),
    ...translationResult.value.map((row) =>
      [
        row.en, // key == en
        row.en, // en
        row.cn, // zh_CN (使用 cn 字段)
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
    // 为加载的数据添加编辑状态属性
    const dataWithEditState = lastTranslation.value.map((row) => ({
      ...row,
      editing_en: false,
      editing_cn: false,
      editing_jp: false,
    }));
    translationResult.value = dataWithEditState;
    dialogVisible.value = true;
  } else {
    ElMessage.warning("No previous translation result found");
  }
};

// 进入编辑状态时，关闭其他所有单元格的编辑状态
const enterEditMode = (rowIndex, columnType) => {
  // 遍历所有行，关闭编辑状态
  translationResult.value.forEach((row, index) => {
    if (index === rowIndex) {
      // 对于当前行，只开启指定列的编辑状态，关闭其他列
      row.editing_en = columnType === "en";
      row.editing_cn = columnType === "cn";
      row.editing_jp = columnType === "jp";
    } else {
      // 对于其他行，关闭所有编辑状态
      row.editing_en = false;
      row.editing_cn = false;
      row.editing_jp = false;
    }
  });
};

// 组件挂载时加载本地存储的翻译结果
onMounted(() => {
  loadLastTranslation();
});

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
        return {
          en,
          cn,
          jp,
          editing_en: false,
          editing_cn: false,
          editing_jp: false,
        };
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
          editing_en: false,
          editing_cn: false,
          editing_jp: false,
        };
      }
    });

    console.log("Final translation result:", translationResult.value);

    // 保存当前翻译结果到 lastTranslation（只保存翻译数据，不包含编辑状态）
    const translationData = translationResult.value.map((row) => ({
      en: row.en,
      cn: row.cn,
      jp: row.jp,
    }));
    lastTranslation.value = translationData;
    saveTranslationToLocal(translationData); // 保存到本地存储
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

/* 表格单元格编辑样式 */
.en-content,
.cn-content,
.jp-content {
  padding: 8px 0px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.2s;
  min-height: 32px;
  display: flex;
  align-items: center;
}

.en-edit,
.cn-edit,
.jp-edit {
  width: 100%;
}

.en-edit .el-input,
.cn-edit .el-input,
.jp-edit .el-input {
  width: 100%;
}

.en-edit .el-input__wrapper,
.cn-edit .el-input__wrapper,
.jp-edit .el-input__wrapper {
  box-shadow: none;
  border: 1px solid #409eff;
  background-color: #ffffff;
}

.en-edit .el-input__inner,
.cn-edit .el-input__inner,
.jp-edit .el-input__inner {
  padding: 4px 8px;
  font-size: 14px;
}
</style>
