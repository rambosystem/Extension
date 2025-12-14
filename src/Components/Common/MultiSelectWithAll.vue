<template>
  <el-select ref="selectRef" :model-value="modelValue" @update:model-value="handleUpdate" multiple
    :placeholder="placeholder" style="width: 100%" @visible-change="handleVisibleChange">
    <template v-if="label" #prefix>
      <span style="display: flex; align-items: center;">
        <span class="filter-label">{{ label }}</span>
        <span class="filter-separator">|</span>
      </span>
    </template>
    <el-option v-if="showSelectAll" :label="selectAllLabel" value="__SELECT_ALL__" />
    <el-option v-for="item in options" :key="getItemKey(item)" :label="getItemLabel(item)"
      :value="getItemValue(item)" />
  </el-select>
</template>

<script setup>
/**
 * MultiSelectWithAll - 带"全选"功能的多选下拉组件
 * 
 * 一个通用的多选下拉组件，基于 Element Plus 的 el-select，支持：
 * - 多选功能
 * - "Select All" 选项（可选择所有选项）
 * - 灵活的数据结构（支持对象数组或字符串数组）
 * - 可配置的键名映射（itemKey、itemLabel、itemValue）
 * - 空列表警告提示
 * 
 * @component
 * @example
 * // 使用对象数组
 * <MultiSelectWithAll
 *   v-model="selectedProjects"
 *   :options="projectList"
 *   label="Project"
 *   placeholder="Select projects"
 *   select-all-label="Select All"
 *   item-key="project_id"
 *   item-label="name"
 *   item-value="name"
 *   @select-all="handleSelectAll"
 * />
 * 
 * @example
 * // 使用字符串数组
 * <MultiSelectWithAll
 *   v-model="selectedItems"
 *   :options="['Option 1', 'Option 2', 'Option 3']"
 *   placeholder="Select items"
 * />
 */
import { ref, watch, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "../../composables/Core/useI18n.js";

const props = defineProps({
  /**
   * 选中的值数组（v-model）
   * @type {Array<String|Number>}
   * @default []
   */
  modelValue: {
    type: Array,
    default: () => [],
  },
  /**
   * 选项列表
   * 可以是字符串数组：['Option 1', 'Option 2']
   * 或对象数组：[{ id: 1, name: 'Option 1' }, { id: 2, name: 'Option 2' }]
   * @type {Array<String|Object>}
   * @default []
   */
  options: {
    type: Array,
    default: () => [],
  },
  /**
   * 下拉框标签（显示在下拉框左侧，可选）
   * @type {String}
   * @default ""
   */
  label: {
    type: String,
    default: "",
  },
  /**
   * 占位符文本
   * @type {String}
   * @default ""
   */
  placeholder: {
    type: String,
    default: "",
  },
  /**
   * 是否显示"Select All"选项
   * @type {Boolean}
   * @default true
   */
  showSelectAll: {
    type: Boolean,
    default: true,
  },
  /**
   * "Select All"选项的标签文本
   * @type {String}
   * @default ""
   */
  selectAllLabel: {
    type: String,
    default: "",
  },
  /**
   * 当选项列表为空时显示的警告消息
   * @type {String}
   * @default ""
   */
  emptyWarningMessage: {
    type: String,
    default: "",
  },
  /**
   * 选项对象的唯一键字段名（用于 key 属性）
   * 当 options 为对象数组时使用
   * @type {String}
   * @default "id"
   */
  itemKey: {
    type: String,
    default: "id",
  },
  /**
   * 选项对象的显示标签字段名（用于 label 属性）
   * 当 options 为对象数组时使用
   * @type {String}
   * @default "name"
   */
  itemLabel: {
    type: String,
    default: "name",
  },
  /**
   * 选项对象的值字段名（用于 value 属性）
   * 当 options 为对象数组时使用
   * @type {String}
   * @default "name"
   */
  itemValue: {
    type: String,
    default: "name",
  },
});

/**
 * 组件事件
 * @typedef {Object} MultiSelectWithAllEmits
 * @property {Array} update:modelValue - 选择值变化时触发，参数为新的选中值数组
 * @property {Array} select-all - 点击"Select All"时触发，参数为所有选项的值数组
 */
const emit = defineEmits(["update:modelValue", "select-all"]);

const { t } = useI18n();
const selectRef = ref(null);

/**
 * 获取选项的唯一键
 * 用于 Vue 的 key 属性，确保列表渲染的正确性
 * @param {String|Object} item - 选项项（字符串或对象）
 * @returns {String|Number} 唯一键值
 */
const getItemKey = (item) => {
  if (typeof item === "string") return item;
  return item[props.itemKey] || item.id || item.name;
};

/**
 * 获取选项的显示标签
 * 用于在下拉列表中显示
 * @param {String|Object} item - 选项项（字符串或对象）
 * @returns {String} 显示标签
 */
const getItemLabel = (item) => {
  if (typeof item === "string") return item;
  return item[props.itemLabel] || item.name || item.label;
};

/**
 * 获取选项的值
 * 用于 v-model 绑定的实际值
 * @param {String|Object} item - 选项项（字符串或对象）
 * @returns {String|Number} 选项值
 */
const getItemValue = (item) => {
  if (typeof item === "string") return item;
  return item[props.itemValue] || item.name || item.value;
};

/**
 * 处理选择变化事件
 * @param {Array} value - 新的选中值数组
 */
const handleUpdate = (value) => {
  emit("update:modelValue", value);
};

/**
 * 处理下拉框显示/隐藏事件
 * 当选项列表为空且提供了警告消息时，显示警告并关闭下拉框
 * @param {Boolean} visible - 是否可见
 */
const handleVisibleChange = (visible) => {
  if (visible && props.options.length === 0 && props.emptyWarningMessage) {
    nextTick(() => {
      if (selectRef.value) {
        selectRef.value.blur();
      }
    });
    ElMessage.warning(props.emptyWarningMessage || t("library.pleaseAuthorizeLokaliseToken"));
  }
};

/**
 * 监听选择变化，处理"Select All"逻辑
 * 
 * 当用户选择"__SELECT_ALL__"选项时：
 * 1. 自动将所有选项的值添加到 modelValue
 * 2. 移除"__SELECT_ALL__"标记
 * 3. 触发 select-all 事件
 * 
 * 使用 nextTick 避免在 watch 中直接修改导致的问题
 */
watch(
  () => props.modelValue,
  (newValue) => {
    if (!Array.isArray(newValue) || props.options.length === 0) return;

    const hasSelectAll = newValue.includes("__SELECT_ALL__");

    if (hasSelectAll) {
      // 如果选择了"Select All"，则选择所有选项（移除"__SELECT_ALL__"标记）
      const allItemValues = props.options.map((item) => getItemValue(item));
      // 使用 nextTick 避免在 watch 中直接修改导致的问题
      nextTick(() => {
        emit("update:modelValue", allItemValues);
        emit("select-all", allItemValues);
      });
    }
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
.filter-label {
  display: flex;
  font-size: 14px;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
}

.filter-separator {
  margin: 0 8px;
  color: #dcdfe6;
}
</style>
