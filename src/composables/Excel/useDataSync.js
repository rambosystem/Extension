import { watch, nextTick } from "vue";

/**
 * 数据同步管理 Composable
 *
 * 负责处理 Excel 组件内部数据与外部 props 的双向同步
 *
 * @param {Object} context - 上下文对象
 * @param {import('vue').Ref} context.tableData - 表格数据
 * @param {Object} context.props - 组件 props
 * @param {Function} context.getData - 获取表格数据
 * @param {Function} context.setData - 设置表格数据
 * @param {Function} context.emit - 事件发射器
 * @returns {Object} 返回数据同步相关方法
 */
export function useDataSync({ tableData, props, getData, setData, emit }) {
  let isUpdatingFromExternal = false;

  /**
   * 通知外部数据变化
   */
  const notifyDataChange = () => {
    if (props.modelValue !== null) {
      // 只有在使用 v-model 时才 emit
      const data = getData();
      emit("update:modelValue", data);
    }
    emit("change", getData());
  };

  /**
   * 初始化数据同步监听
   */
  const initDataSync = () => {
    // 监听内部数据变化（深度监听，使用 nextTick 避免频繁触发）
    watch(
      tableData,
      () => {
        if (!isUpdatingFromExternal) {
          nextTick(() => {
            notifyDataChange();
          });
        }
      },
      { deep: true }
    );

    // 监听外部数据变化（props.modelValue）
    watch(
      () => props.modelValue,
      (newValue) => {
        // 处理 null、undefined、空数组和有效数组
        if (props.modelValue !== null && Array.isArray(newValue)) {
          // 只有当外部数据真正变化时才更新（避免循环更新）
          const currentData = JSON.stringify(getData());
          const newData = JSON.stringify(newValue);
          if (currentData !== newData) {
            isUpdatingFromExternal = true;
            setData(newValue);
            nextTick(() => {
              isUpdatingFromExternal = false;
            });
          }
        }
      },
      { deep: true, immediate: false }
    );
  };

  /**
   * 设置数据（带外部更新标记）
   * @param {string[][]} data - 表格数据
   */
  const setDataWithSync = (data) => {
    isUpdatingFromExternal = true;
    setData(data);
    nextTick(() => {
      isUpdatingFromExternal = false;
      notifyDataChange();
    });
  };

  return {
    notifyDataChange,
    initDataSync,
    setDataWithSync,
  };
}
