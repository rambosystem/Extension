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
        <div ref="excelWrapperRef" class="excel-wrapper">
          <Excel
            ref="excelRef"
            v-model="excelData"
            @change="handleExcelDataChange"
            :enableColumnResize="true"
            :enableRowResize="false"
            :enableFillHandle="true"
            :defaultColumnWidth="calculatedColumnWidth"
            :columnNames="getColumnConfig.columnNames"
            :custom-menu-items="customMenuItems"
            @custom-action="handleCustomAction"
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
import { ElMessage } from "element-plus";

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
  // - 垂直滚动条宽度: 17px（预留，避免最右边列被垂直滚动条遮挡）
  const containerPadding = 20; // excel-container 左右 padding
  const rowNumberWidth = 40; // 行号列宽度
  const scrollbarWidth = 17; // 垂直滚动条宽度（预留位置）
  const availableWidth =
    actualDialogWidth - containerPadding - rowNumberWidth - scrollbarWidth;

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
      let dialogElement = null;

      // 处理 Vue 3 组件引用
      if (dialogRef.value.$el) {
        dialogElement = dialogRef.value.$el;
      } else if (dialogRef.value instanceof HTMLElement) {
        dialogElement = dialogRef.value;
      } else if (dialogRef.value && typeof dialogRef.value === "object") {
        // 尝试获取组件的根元素
        const componentInstance = dialogRef.value;
        if (componentInstance.$el) {
          dialogElement = componentInstance.$el;
        } else if (componentInstance.el) {
          dialogElement = componentInstance.el;
        }
      }

      // 确保 dialogElement 是 DOM 元素且有 querySelector 方法
      if (
        dialogElement &&
        dialogElement instanceof HTMLElement &&
        typeof dialogElement.querySelector === "function"
      ) {
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

  // 保留所有行（包括空行），因为用户可能正在编辑或刚插入新行
  // 只在导出或保存时过滤空行，而不是在每次数据变化时过滤
  return excelDataArray.map((row) => {
    const item = {};
    fieldNames.forEach((field, index) => {
      item[field] = row[index] || "";
    });
    return item;
  });
};

/**
 * 监听翻译结果变化，更新Excel数据
 * 添加深度比较，避免在用户操作时覆盖数据
 */
watch(
  () => translationCoreStore.translationResult,
  (newResult) => {
    const newExcelData = convertToExcelData(newResult);
    // 深度比较，避免不必要的更新（防止覆盖用户正在进行的操作）
    const currentDataStr = JSON.stringify(excelData.value);
    const newDataStr = JSON.stringify(newExcelData);
    if (currentDataStr !== newDataStr) {
      excelData.value = newExcelData;
    }
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

// 用于防止循环更新的标志
let isUpdatingKeyOrder = false;

/**
 * 处理Excel数据变化
 * 当key列发生变化时，自动确保key是唯一且按顺序排列的
 * @param {Array<string[]>} data - Excel数据
 */
const handleExcelDataChange = (data) => {
  // 如果正在更新key顺序，跳过处理（避免循环更新）
  if (isUpdatingKeyOrder) {
    return;
  }

  // 检查第一列是否为Key列
  const columnNames = getColumnConfig.value.columnNames;
  const isKeyColumn = columnNames[0] === "Key";

  // 如果key列有变化，尝试确保key顺序
  if (isKeyColumn) {
    nextTick(() => {
      if (isUpdatingKeyOrder) {
        return;
      }

      // 尝试确保key顺序
      const updated = ensureKeyOrder(data);
      if (updated) {
        // 如果更新了key，setData 会自动触发 change 事件
        // 设置标志，避免循环更新
        isUpdatingKeyOrder = true;
        nextTick(() => {
          isUpdatingKeyOrder = false;
        });
        // 不需要在这里再次处理数据，因为 setData 会触发 change 事件
        return;
      }
    });
  }

  // 正常处理数据变化（无论是否更新了key，都需要同步数据）
  const translationData = convertFromExcelData(data);
  translationCoreStore.setTranslationResult(translationData);
  translationCoreStore.saveTranslationToLocal(translationData);
};

/**
 * 自定义菜单项配置
 * 只在列名为 "Key" 时显示自增填充菜单项
 */
const customMenuItems = computed(() => {
  // 获取当前列配置，检查第一列是否为 "Key"
  const columnNames = getColumnConfig.value.columnNames;
  const isKeyColumn = columnNames[0] === "Key";

  return [
    {
      id: "auto-increment-key",
      label: "Auto Increment",
      shortcut: "Ctrl+Alt+A",
      validate: (ctx) => {
        // 验证：列名必须为 "Key"，且选区必须在第一列（Key列）
        if (!isKeyColumn) return false;

        const { normalizedSelection, multiSelections, isMultipleMode } = ctx;

        // 多选模式：检查是否有至少一个选区包含第一列（Key列）的单元格
        if (isMultipleMode && multiSelections && multiSelections.length > 0) {
          // 检查是否有至少一个选区包含第一列（minCol <= 0 <= maxCol）
          return multiSelections.some(
            (selection) => selection.minCol <= 0 && selection.maxCol >= 0
          );
        }

        // 单选模式：检查选区是否包含第一列（索引为0）
        if (!normalizedSelection) return false;
        return (
          normalizedSelection.minCol <= 0 && normalizedSelection.maxCol >= 0
        );
      },
    },
  ];
});

/**
 * 从 key 字符串中提取前缀和数字
 * @param {string} key - key 字符串（如 "key1", "a5"）
 * @returns {Object|null} { prefix: string, number: number } 或 null
 */
const parseKey = (key) => {
  if (!key || typeof key !== "string") return null;
  const match = key.trim().match(/^([a-zA-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    number: parseInt(match[2], 10),
  };
};

/**
 * 获取所有已使用的 key 列表
 * @returns {Set<string>} 已使用的 key 集合
 */
const getUsedKeys = () => {
  const usedKeys = new Set();
  const translationResult = translationCoreStore.translationResult || [];

  translationResult.forEach((item) => {
    const key = item?.key;
    if (key && typeof key === "string" && key.trim()) {
      usedKeys.add(key.trim());
    }
  });

  return usedKeys;
};

/**
 * 获取已使用 key 的数字集合（基于相同的 prefix）
 * @param {string} prefix - key 前缀
 * @param {Set<string>} usedKeys - 已使用的 key 集合
 * @returns {Set<number>} 已使用的数字集合
 */
const getUsedNumbers = (prefix, usedKeys) => {
  const usedNumbers = new Set();

  usedKeys.forEach((key) => {
    const parsed = parseKey(key);
    if (parsed && parsed.prefix.toLowerCase() === prefix.toLowerCase()) {
      usedNumbers.add(parsed.number);
    }
  });

  return usedNumbers;
};

/**
 * 生成下一个可用的 key
 * @param {string} baselineKey - 基准 key（如 "key1"）
 * @param {Set<string>} usedKeys - 已使用的 key 集合（会被修改，添加新生成的 key）
 * @returns {string} 下一个可用的 key
 */
const generateNextAvailableKey = (baselineKey, usedKeys) => {
  const parsed = parseKey(baselineKey);
  if (!parsed) {
    // 如果 baseline key 格式不正确，使用默认格式
    let nextNumber = 1;
    let newKey = `key${nextNumber}`;
    while (usedKeys.has(newKey)) {
      nextNumber++;
      newKey = `key${nextNumber}`;
    }
    usedKeys.add(newKey);
    return newKey;
  }

  const { prefix, number: baselineNumber } = parsed;
  const usedNumbers = getUsedNumbers(prefix, usedKeys);

  // 如果没有已使用的数字，从 baseline number 开始
  if (usedNumbers.size === 0) {
    const newKey = `${prefix}${baselineNumber}`;
    usedKeys.add(newKey);
    return newKey;
  }

  // 找出缺失的数字（在已使用数字范围内的空缺）
  const maxUsedNumber = Math.max(...usedNumbers);

  // 查找缺失的数字
  // 搜索范围：从 baselineNumber 开始，到 maxUsedNumber
  // 最小值一定是 baselineNumber（baseline key 的数字部分）
  const missingNumbers = [];

  // 如果 maxUsedNumber < baselineNumber，说明 baselineNumber 本身就是一个缺失的数字
  if (maxUsedNumber < baselineNumber) {
    // baselineNumber 就是缺失的数字，直接使用
    const newKey = `${prefix}${baselineNumber}`;
    usedKeys.add(newKey);
    return newKey;
  }

  // 在 baselineNumber 到 maxUsedNumber 之间查找缺失的数字
  for (let i = baselineNumber; i <= maxUsedNumber; i++) {
    if (!usedNumbers.has(i)) {
      missingNumbers.push(i);
    }
  }

  // 优先使用缺失的数字（从小到大排序）
  if (missingNumbers.length > 0) {
    missingNumbers.sort((a, b) => a - b);
    const nextNumber = missingNumbers[0];
    const newKey = `${prefix}${nextNumber}`;
    usedKeys.add(newKey);
    return newKey;
  }

  // 如果没有缺失的数字，使用下一个递增的数字
  // 取 maxUsedNumber + 1 和 baselineNumber 中的较大值（确保不小于 baselineNumber）
  let nextNumber = Math.max(maxUsedNumber + 1, baselineNumber);
  let newKey = `${prefix}${nextNumber}`;

  // 确保生成的 key 是唯一的
  while (usedKeys.has(newKey)) {
    nextNumber++;
    newKey = `${prefix}${nextNumber}`;
  }

  usedKeys.add(newKey);
  return newKey;
};

/**
 * 确保key列中的所有key是唯一且按顺序排列的
 * 当key列发生变化时（删除行、修改值等），自动重新排序所有key
 *
 * @param {Array<string[]>} data - Excel数据（可选，如果不提供则从组件获取）
 * @returns {boolean} 是否进行了更新
 */
const ensureKeyOrder = (data = null) => {
  try {
    // 检查第一列是否为Key列
    const columnNames = getColumnConfig.value.columnNames;
    const isKeyColumn = columnNames[0] === "Key";

    if (!isKeyColumn) {
      return false; // 如果不是Key列，不处理
    }

    // 获取baseline key
    const baselineKey =
      exportStore.excelBaselineKey ||
      localStorage.getItem("excel_baseline_key") ||
      "key1";

    // 解析baseline key
    const parsed = parseKey(baselineKey);
    if (!parsed) {
      console.warn(
        "Invalid baseline key format, skipping key reorder",
        baselineKey
      );
      return false;
    }

    const { prefix } = parsed;

    if (!excelRef.value) {
      return false;
    }

    // 获取当前数据
    let currentData = data;
    if (!currentData) {
      const getData = excelRef.value.getData;
      if (!getData) {
        return false;
      }
      currentData = getData();
    }

    if (!currentData || currentData.length === 0) {
      return false;
    }

    // 收集所有需要重新排序的行（只处理符合格式的key）
    const rowsWithKeys = [];
    for (let row = 0; row < currentData.length; row++) {
      const rowData = currentData[row];
      if (!rowData || rowData.length === 0) {
        continue;
      }
      const key = rowData[0]; // 第一列是key列
      if (key && typeof key === "string" && key.trim()) {
        const keyParsed = parseKey(key.trim());
        if (
          keyParsed &&
          keyParsed.prefix.toLowerCase() === prefix.toLowerCase()
        ) {
          rowsWithKeys.push({ row, key: key.trim(), parsed: keyParsed });
        }
      }
    }

    // 如果没有需要重新排序的行，直接返回
    if (rowsWithKeys.length === 0) {
      return false;
    }

    // 按行索引排序
    rowsWithKeys.sort((a, b) => a.row - b.row);

    // 检查是否需要更新（检查是否有重复或顺序不正确）
    let needsUpdate = false;
    const usedKeys = new Set();
    let expectedNumber = parsed.number;

    for (const item of rowsWithKeys) {
      // 检查是否有重复
      if (usedKeys.has(item.key)) {
        needsUpdate = true;
        break;
      }
      usedKeys.add(item.key);

      // 检查顺序是否正确
      if (item.parsed.number !== expectedNumber) {
        needsUpdate = true;
        break;
      }
      expectedNumber++;
    }

    // 如果不需要更新，直接返回
    if (!needsUpdate) {
      return false;
    }

    // 重新生成所有key，使其连续且唯一
    let currentNumber = parsed.number;
    const updates = [];

    for (const item of rowsWithKeys) {
      const newKey = `${prefix}${currentNumber}`;
      // 只有当key发生变化时才记录更新
      if (item.key !== newKey) {
        updates.push({ row: item.row, key: newKey });
      }
      currentNumber++;
    }

    // 批量更新所有key（避免多次触发数据同步）
    if (updates.length > 0) {
      const setData = excelRef.value.setData;
      if (setData) {
        // 使用 setData 批量更新
        const updatedData = currentData.map((row, index) => {
          const update = updates.find((u) => u.row === index);
          if (update) {
            const newRow = [...row];
            newRow[0] = update.key; // 更新第一列（key列）
            return newRow;
          }
          return row;
        });
        setData(updatedData);
        return true;
      } else {
        // 如果 setData 不可用，回退到逐个更新
        const updateCell = excelRef.value.updateCell;
        if (updateCell) {
          for (const update of updates) {
            updateCell(update.row, 0, update.key);
          }
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error in ensureKeyOrder:", error);
    return false;
  }
};

/**
 * 处理自定义菜单项点击事件
 * @param {Object} payload - 事件载荷 { id: string, context: Object }
 */
const handleCustomAction = ({ id, context }) => {
  if (id === "auto-increment-key") {
    const { normalizedSelection, multiSelections, isMultipleMode, updateCell } =
      context;

    // 获取 baseline key
    const baselineKey =
      exportStore.excelBaselineKey ||
      localStorage.getItem("excel_baseline_key") ||
      "";

    // 检查 baseline key 是否存在
    if (!baselineKey || !baselineKey.trim()) {
      ElMessage.warning(
        t("translation.autoIncrementBaselineKeyRequired") ||
          "Please configure baseline key in settings before using auto increment"
      );
      return;
    }

    // 检查 baseline key 格式是否正确
    const parsed = parseKey(baselineKey);
    if (!parsed) {
      ElMessage.warning(
        t("translation.autoIncrementBaselineKeyInvalid") ||
          "Baseline key format is invalid. Please use format like 'key1', 'item5', etc."
      );
      return;
    }

    // 获取已使用的 key 列表
    const usedKeys = getUsedKeys();
    const translationResult = translationCoreStore.translationResult || [];
    const { prefix } = parsed;

    // 收集所有需要处理的单元格行索引
    let targetRows = [];

    // 多选模式：处理所有包含第一列（Key列）的单元格
    if (isMultipleMode && multiSelections && multiSelections.length > 0) {
      // 收集所有在第一列的单元格行索引（去重）
      const targetRowsSet = new Set();

      // 遍历所有选区，收集所有在第一列的单元格
      for (const selection of multiSelections) {
        // 检查选区是否包含第一列（minCol <= 0 <= maxCol）
        if (selection.minCol <= 0 && selection.maxCol >= 0) {
          // 如果选区包含第一列，收集该选区的所有行
          for (let row = selection.minRow; row <= selection.maxRow; row++) {
            targetRowsSet.add(row);
          }
        }
      }

      // 转换为数组并排序
      targetRows = Array.from(targetRowsSet).sort((a, b) => a - b);
    } else if (normalizedSelection) {
      // 单选模式：使用 normalizedSelection
      const { minRow, maxRow } = normalizedSelection;
      // 按顺序生成行索引数组
      for (let row = minRow; row <= maxRow; row++) {
        targetRows.push(row);
      }
    }

    // 如果有符合条件的单元格，按顺序重新生成所有 key
    if (targetRows.length > 0) {
      // 先清除这些行的现有 key（如果符合格式），避免影响唯一性检查
      for (const row of targetRows) {
        const currentItem = translationResult[row];
        const existingKey = currentItem?.key;
        if (
          existingKey &&
          typeof existingKey === "string" &&
          existingKey.trim()
        ) {
          const existingParsed = parseKey(existingKey.trim());
          if (
            existingParsed &&
            existingParsed.prefix.toLowerCase() === prefix.toLowerCase()
          ) {
            // 从已使用列表中移除，以便重新生成
            usedKeys.delete(existingKey.trim());
          }
        }
      }

      // 按顺序重新生成所有 key
      for (const row of targetRows) {
        // 生成新的 key（会自动处理缺失的 key 和唯一性）
        const value = generateNextAvailableKey(baselineKey, usedKeys);
        updateCell(row, 0, value);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.excel-wrapper {
  min-height: 400px;
  max-height: 600px;
  position: relative;
  width: 100%;
  overflow-y: auto; // 只允许垂直滚动条，禁止横向滚动条
  overflow-x: hidden; // 隐藏横向滚动条
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
