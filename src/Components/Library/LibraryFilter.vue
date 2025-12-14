<template>
  <div class="library-filter">
    <el-row :gutter="20" class="filter-form">
      <el-col :span="12">
        <PopupTextInput :model-value="props.filterKeyName" @update:model-value="handleKeyNameUpdate"
          :label="labelKeyName" :placeholder="placeholderKeyName" :popup-placeholder="popupPlaceholderKeyName"
          :conditions="props.filterConditions" :condition="props.filterCondition"
          :multiple-display-format="multipleKeyNamesFormat" @update:condition="handleConditionChange" />
      </el-col>
      <el-col :span="12">
        <MultiSelectWithAll :model-value="props.filterProject" @update:model-value="handleProjectUpdate"
          :options="props.projectList" :label="labelProject" :placeholder="placeholderProject"
          :select-all-label="selectAllLabel" :empty-warning-message="emptyWarningMessage" item-key="project_id"
          item-label="name" item-value="name" />
      </el-col>
    </el-row>
    <div class="filter-buttons">
      <el-button @click="handleClear">{{ clearLabel }}</el-button>
      <el-button type="primary" @click="handleSearch">
        {{ searchLabel }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import PopupTextInput from "../Common/PopupTextInput.vue";
import MultiSelectWithAll from "../Common/MultiSelectWithAll.vue";
import en from "../../locales/en.json";
import zh_CN from "../../locales/zh_CN.json";

const props = defineProps({
  filterKeyName: {
    type: String,
    required: true,
  },
  filterProject: {
    type: Array,
    required: true,
  },
  filterCondition: {
    type: String,
    required: true,
  },
  filterConditions: {
    type: Array,
    required: true,
  },
  projectList: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:filterKeyName", "update:filterProject", "update:filterCondition", "clear", "search"]);

const { t, currentLanguage } = useI18n();

const messages = {
  en,
  zh_CN,
};
const globalLanguage = currentLanguage;

// 翻译标签
const labelKeyName = computed(() => t("library.filterKeyName"));
const placeholderKeyName = computed(() => t("library.filterKeyNamePlaceholder"));
const popupPlaceholderKeyName = computed(() => t("library.keyNamePopupPlaceholder"));
const labelProject = computed(() => t("library.filterProject"));
const placeholderProject = computed(() => t("library.filterProjectPlaceholder"));
const selectAllLabel = computed(() => t("library.selectAll"));
const emptyWarningMessage = computed(() => t("library.pleaseAuthorizeLokaliseToken"));
const clearLabel = computed(() => t("library.clear"));
const searchLabel = computed(() => t("library.search"));

// 多个 key name 的显示格式
// 直接从语言包获取原始字符串（包含 {count} 占位符）
const multipleKeyNamesFormat = computed(() => {
  const keys = "library.multipleKeyNames".split(".");
  const currentMessages = messages[globalLanguage.value] || messages["en"];
  const value = keys.reduce((obj, k) => obj?.[k], currentMessages);
  return value || "{count} Key Names";
});

/**
 * 处理 Key Name 更新
 */
const handleKeyNameUpdate = (value) => {
  emit("update:filterKeyName", value);
};

/**
 * 处理 Project 更新
 */
const handleProjectUpdate = (value) => {
  emit("update:filterProject", value);
};

/**
 * 处理条件变化
 */
const handleConditionChange = (condition) => {
  emit("update:filterCondition", condition);
};

/**
 * 处理清除
 */
const handleClear = () => {
  emit("clear");
};

/**
 * 处理搜索
 */
const handleSearch = () => {
  emit("search");
};
</script>

<style lang="scss" scoped>
.library-filter {
  .filter-form {
    margin: 0;
  }

  .filter-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }
}
</style>
