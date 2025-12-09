<template>
  <el-dialog
    ref="dialogRef"
    :modelValue="translationCoreStore.dialogVisible"
    @update:modelValue="translationCoreStore.setDialogVisible"
    width="70%"
    @opened="updateDialogWidth"
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-title-wrapper">
          <span class="dialog-title">{{
            t("translation.translationResult")
          }}</span>
          <div
            v-if="translationCoreStore.loadingStates.translation"
            class="loading-indicator"
          >
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span class="loading-text">{{
              translationCoreStore.getStatusText()
            }}</span>
            <span
              v-if="translationCoreStore.translationProgress.total > 0"
              class="progress-counter"
            >
              {{ translationCoreStore.translationProgress.finished }} /
              {{ translationCoreStore.translationProgress.total }}
            </span>
          </div>
        </div>
      </div>
    </template>
    <el-form label-position="top">
      <el-form-item>
        <div
          ref="excelWrapperRef"
          v-loading="translationCoreStore.loadingStates.translation"
          :element-loading-text="translationCoreStore.getStatusText()"
          class="excel-wrapper"
        >
          <Excel
            ref="excelRef"
            v-model="excelData"
            @change="handleExcelDataChange"
            :enableColumnResize="true"
            :enableRowResize="false"
            :enableFillHandle="true"
            :defaultColumnWidth="calculatedColumnWidth"
            :columnNames="getColumnConfig.columnNames"
          />
        </div>
      </el-form-item>
      <div class="dialog-button-container">
        <el-button @click="translationCoreStore.closeDialog()">{{
          t("common.cancel")
        }}</el-button>
        <el-button
          type="primary"
          @click="
            exportStore.exportExcel(translationCoreStore.translationResult)
          "
          :disabled="translationCoreStore.isTranslating"
          >{{ t("translation.exportExcel") }}</el-button
        >
        <el-button
          type="primary"
          @click="
            uploadStore.uploadToLokalise(translationCoreStore.translationResult)
          "
          :disabled="translationCoreStore.isTranslating"
          >{{ t("translation.uploadToLokalise") }}</el-button
        >
      </div>
    </el-form>
  </el-dialog>
</template>

<script setup>
import Excel from "../Common/Excel.vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";
import { useExportStore } from "../../stores/translation/export.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import { Loading } from "@element-plus/icons-vue";
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from "vue";

const { t } = useI18n();

const translationCoreStore = useTranslationCoreStore();
const exportStore = useExportStore();
const uploadStore = useUploadStore();

const excelData = ref([]);
const dialogRef = ref(null);
const excelWrapperRef = ref(null);
const dialogWidth = ref(0);

/**
 * 将语言代码转换为字段名（与 prompt 中的格式一致）
 * 格式：小写 + 下划线，例如 "Chinese" -> "chinese", "Spanish (Latam)" -> "spanish_(latam)"
 * @param {string} languageCode - 语言代码
 * @returns {string} 字段名
 */
const languageCodeToFieldName = (languageCode) => {
  return languageCode
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

/**
 * 格式化字段名为显示名称
 * @param {string} fieldName - 字段名（如 "chinese", "japanese"）
 * @returns {string} 显示名称（如 "Chinese", "Japanese"）
 */
const formatLanguageLabel = (fieldName) => {
  if (fieldName === "en") return "English";
  if (fieldName === "key") return "Key";

  // 将下划线替换为空格，然后首字母大写
  return fieldName
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * 根据翻译结果中的 targetLanguages 确定列顺序
 * 列顺序：key, en, 然后按照翻译时的 targetLanguages 的顺序
 * @returns {string[]} 字段名数组
 */
const extractFieldNames = () => {
  const fieldNames = ["key", "en"]; // 固定前两列

  // 使用翻译时的 targetLanguages（如果存在），否则使用当前的
  const targetLanguages =
    translationCoreStore.translationTargetLanguages?.length > 0
      ? translationCoreStore.translationTargetLanguages
      : exportStore.targetLanguages || [];

  targetLanguages.forEach((langCode) => {
    const fieldName = languageCodeToFieldName(langCode);
    if (!fieldNames.includes(fieldName)) {
      fieldNames.push(fieldName);
    }
  });

  return fieldNames;
};

/**
 * 获取列配置（列名和字段名）
 * 根据 targetLanguages 确定列顺序
 */
const getColumnConfig = computed(() => {
  const fieldNames = extractFieldNames();
  const columnNames = fieldNames.map((field) => formatLanguageLabel(field));
  return { columnNames, fieldNames };
});

/**
 * 计算每列的宽度，使表格总宽度匹配对话框宽度
 * Key列固定120px，其他列平均分配剩余空间
 */
const calculatedColumnWidth = computed(() => {
  const { fieldNames } = getColumnConfig.value;
  const columnCount = fieldNames.length;

  if (columnCount === 0) {
    return 200; // 默认宽度
  }

  // 使用实际测量的对话框宽度
  const actualDialogWidth = dialogWidth.value || window.innerWidth * 0.7;

  // 精确计算可用宽度：
  // - excel-container 左右 padding: 10px * 2 = 20px
  // - 行号列宽度: 40px
  const containerPadding = 20; // excel-container 左右 padding
  const rowNumberWidth = 40; // 行号列宽度
  const availableWidth = actualDialogWidth - containerPadding - rowNumberWidth;

  // Key列固定宽度
  const keyColumnWidth = 120;

  // 计算其他列的可用宽度（减去Key列宽度）
  const otherColumnsWidth = availableWidth - keyColumnWidth;
  const otherColumnsCount = columnCount - 1; // 除了Key列之外的其他列数

  // 如果只有Key列，返回Key列宽度
  if (otherColumnsCount <= 0) {
    return keyColumnWidth;
  }

  // 其他列平均分配剩余空间
  const otherColumnsAverageWidth = otherColumnsWidth / otherColumnsCount;

  // 返回一个对象，包含Key列和其他列的宽度
  // 注意：这里返回的是其他列的宽度，Key列宽度需要在Excel组件中特殊处理
  return {
    key: keyColumnWidth,
    others: otherColumnsAverageWidth,
  };
});

/**
 * 更新对话框宽度
 */
const updateDialogWidth = () => {
  nextTick(() => {
    if (excelWrapperRef.value) {
      // 直接获取 excel-wrapper 的实际宽度
      const wrapperWidth = excelWrapperRef.value.offsetWidth;
      if (wrapperWidth > 0) {
        dialogWidth.value = wrapperWidth;
      }
    } else if (dialogRef.value) {
      // 如果 excel-wrapper 还没有渲染，尝试从对话框获取
      const dialogElement = dialogRef.value.$el || dialogRef.value;
      if (dialogElement) {
        const dialogBody = dialogElement.querySelector(".el-dialog__body");
        if (dialogBody) {
          dialogWidth.value = dialogBody.offsetWidth;
        }
      }
    }
  });
};

/**
 * 监听窗口大小变化
 */
const handleResize = () => {
  updateDialogWidth();
};

onMounted(() => {
  // 监听对话框打开
  watch(
    () => translationCoreStore.dialogVisible,
    (visible) => {
      if (visible) {
        // 对话框打开后更新宽度，使用多个延迟确保 DOM 完全渲染
        setTimeout(() => {
          updateDialogWidth();
        }, 50);
        setTimeout(() => {
          updateDialogWidth();
        }, 200);
        setTimeout(() => {
          updateDialogWidth();
        }, 500);
      }
    },
    { immediate: true }
  );

  // 监听窗口大小变化
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

/**
 * 从对象中获取字段值
 * @param {Object} item - 数据对象
 * @param {string} fieldName - 字段名
 * @returns {string} 字段值
 */
const getFieldValue = (item, fieldName) => {
  if (!item || typeof item !== "object") return "";

  // 排除编辑状态字段
  if (fieldName.startsWith("editing_")) return "";

  // 精确匹配
  if (item.hasOwnProperty(fieldName)) {
    return item[fieldName] || "";
  }

  // 不区分大小写匹配（排除编辑状态字段）
  const actualKey = Object.keys(item).find((key) => {
    if (key.startsWith("editing_")) return false;
    return key.toLowerCase() === fieldName.toLowerCase();
  });

  return actualKey ? item[actualKey] || "" : "";
};

/**
 * 转换为Excel数据格式
 * @param {Array} translationResult - 翻译结果数组
 * @returns {Array<string[]>} Excel数据格式（二维数组）
 */
const convertToExcelData = (translationResult) => {
  const { fieldNames } = getColumnConfig.value;

  if (!translationResult || translationResult.length === 0) {
    // 数据为空时，创建空行以保持正确的列数
    return [Array.from({ length: fieldNames.length }, () => "")];
  }

  return translationResult.map((item) => {
    return fieldNames.map((field) => {
      // key 字段默认为空
      if (field === "key") {
        return getFieldValue(item, "key") || "";
      }
      return getFieldValue(item, field);
    });
  });
};

/**
 * 从Excel数据格式转换回翻译结果格式
 * @param {Array<string[]>} excelDataArray - Excel数据数组
 * @returns {Array<Object>} 翻译结果数组
 */
const convertFromExcelData = (excelDataArray) => {
  if (!excelDataArray || excelDataArray.length === 0) {
    return [];
  }

  const { fieldNames } = getColumnConfig.value;

  // 过滤掉完全空白的行
  return excelDataArray
    .filter(
      (row) => row && row.some((cell) => cell && String(cell).trim() !== "")
    )
    .map((row) => {
      const item = {};
      fieldNames.forEach((field, index) => {
        item[field] = row[index] || "";
      });
      return item;
    });
};

/**
 * 监听翻译结果变化，更新Excel数据
 */
watch(
  () => translationCoreStore.translationResult,
  (newResult) => {
    excelData.value = convertToExcelData(newResult);
  },
  { immediate: true }
);

/**
 * 监听目标语言变化，重新生成列配置
 */
watch(
  () => exportStore.targetLanguages,
  () => {
    excelData.value = convertToExcelData(
      translationCoreStore.translationResult
    );
    // 列数变化时重新计算宽度
    updateDialogWidth();
  }
);

/**
 * 监听列数变化，重新计算列宽
 */
watch(
  () => getColumnConfig.value.fieldNames.length,
  () => {
    updateDialogWidth();
  }
);

// Excel组件引用
const excelRef = ref(null);

/**
 * 处理Excel数据变化
 * @param {Array<string[]>} data - Excel数据
 */
const handleExcelDataChange = (data) => {
  const translationData = convertFromExcelData(data);
  translationCoreStore.setTranslationResult(translationData);
  translationCoreStore.saveTranslationToLocal(translationData);
};
</script>

<style lang="scss" scoped>
.excel-wrapper {
  min-height: 400px;
  max-height: 600px;
  position: relative;
  width: 100%;
  overflow: hidden;
}

.dialog-button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
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

/* 设置对话框内边距 */
:deep(.el-dialog) {
  --el-dialog-padding-primary: 20px;
}

:deep(.el-dialog__body) {
  padding: 16px 20px;
}

/* 对话框标题样式 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.dialog-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.dialog-title {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #409eff;
  font-size: 14px;
  margin-left: 0;
}

.loading-indicator .el-icon {
  font-size: 16px;
}

.loading-text {
  color: #409eff;
}

.progress-counter {
  color: #909399;
  font-size: 13px;
  margin-left: 4px;
}
</style>
