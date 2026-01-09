import { watch, nextTick, type Ref } from "vue";

/**
 * useDataSync 选项
 */
export interface UseDataSyncOptions {
  tableData: Ref<string[][]>;
  props: {
    modelValue?: string[][] | null;
  };
  getData: () => string[][];
  setData: (data: string[][]) => void;
  emit: (event: string, ...args: any[]) => void;
}

/**
 * useDataSync 返回值
 */
export interface UseDataSyncReturn {
  notifyDataChange: () => void;
  initDataSync: () => void;
  setDataWithSync: (data: string[][]) => void;
}

/**
 * 数据同步管理 Composable
 */
export function useDataSync({
  tableData,
  props,
  getData,
  setData,
  emit,
}: UseDataSyncOptions): UseDataSyncReturn {
  let isUpdatingFromExternal = false;

  /**
   * 通知外部数据变化
   */
  const notifyDataChange = (): void => {
    if (props.modelValue !== null) {
      const data = getData();
      emit("update:modelValue", data);
    }
    emit("change", getData());
  };

  /**
   * 初始化数据同步监听
   */
  const initDataSync = (): void => {
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

    watch(
      () => props.modelValue,
      (newValue) => {
        if (props.modelValue !== null && Array.isArray(newValue)) {
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
   */
  const setDataWithSync = (data: string[][]): void => {
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
