import { watch, nextTick, ref, type Ref } from "vue";

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
  emit: (event: "update:modelValue" | "change", ...args: unknown[]) => void;
  initHistory?: (state: string[][]) => void;
  isUndoRedoInProgress?: () => boolean;
}

/**
 * useDataSync 返回值
 */
export interface UseDataSyncReturn {
  emitSync: (data?: string[][]) => void;
  emitChange: (data?: string[][]) => void;
  emitModelUpdate: (data?: string[][]) => void;
  initDataSync: () => void;
  setDataWithSync: (data: string[][]) => void;
  runExternalUpdate: (
    mutation: () => void,
    options?: {
      emitSync?: boolean;
      emitChange?: boolean;
      emitModelUpdate?: boolean;
      reinitHistory?: boolean;
      data?: string[][];
    }
  ) => void;
}

/**
 * 快速比较两个二维数组是否相等（优化性能）
 * 只比较结构，不进行深比较（因为数据变化时结构通常也会变化）
 */
const isDataEqual = (a: string[][], b: string[][]): boolean => {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;

  // 快速检查：比较第一行的列数
  if (a[0]?.length !== b[0]?.length) return false;

  // 对于大数据，使用 JSON 比较（但只在必要时）
  // 对于小数据，可以逐行比较
  if (a.length * (a[0]?.length || 0) < 100) {
    // 小数据：逐行比较
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.length !== b[i]?.length) return false;
      for (let j = 0; j < (a[i]?.length || 0); j++) {
        if (a[i]?.[j] !== b[i]?.[j]) return false;
      }
    }
    return true;
  }

  // 大数据：使用 JSON 比较（性能权衡）
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/**
 * 数据同步管理 Composable
 *
 * 优化点：
 * 1. 使用 ref 替代闭包变量，提升可维护性
 * 2. 简化 watch 逻辑，减少嵌套
 * 3. 优化数据比较性能
 * 4. 提取辅助函数，提升代码可读性
 */
export function useDataSync({
  tableData,
  props,
  getData,
  setData,
  emit,
  initHistory,
  isUndoRedoInProgress,
}: UseDataSyncOptions): UseDataSyncReturn {
  // 使用 ref 替代闭包变量，提升可维护性和可追踪性
  const isUpdatingFromExternal = ref(false);
  const isInternalUpdateEmitted = ref(false);

  /**
   * 通知外部数据变化
   */
  const emitModelUpdate = (data?: string[][]): void => {
    if (props.modelValue === null) {
      return;
    }
    const payload = data ?? getData();
    emit("update:modelValue", payload);
  };

  const emitChange = (data?: string[][]): void => {
    const payload = data ?? getData();
    emit("change", payload);
  };

  const emitSync = (data?: string[][]): void => {
    const payload = data ?? getData();
    isInternalUpdateEmitted.value = true;
    emitModelUpdate(payload);
    emitChange(payload);
    nextTick(() => {
      isInternalUpdateEmitted.value = false;
    });
  };

  const runExternalUpdate = (
    mutation: () => void,
    options?: {
      emitSync?: boolean;
      emitChange?: boolean;
      emitModelUpdate?: boolean;
      reinitHistory?: boolean;
      data?: string[][];
    }
  ): void => {
    isUpdatingFromExternal.value = true;
    mutation();

    nextTick(() => {
      isUpdatingFromExternal.value = false;

      if (options?.emitSync || options?.emitModelUpdate) {
        emitModelUpdate(options.data);
      }

      if (options?.emitSync || options?.emitChange) {
        emitChange(options.data);
      }

      if (options?.reinitHistory && initHistory && options?.data?.length) {
        initHistory(options.data);
      }
    });
  };

  /**
   * 检查是否应该跳过数据变化通知
   */
  const shouldSkipNotification = (): boolean => {
    // 如果正在从外部更新，跳过通知
    if (isUpdatingFromExternal.value) {
      return true;
    }
    // 如果正在进行撤销/重做操作，跳过通知
    // handleUndoRedoOperation 会在 isUndoRedoInProgress 重置后手动调用 emitModelUpdate/emitChange
    if (isUndoRedoInProgress && isUndoRedoInProgress()) {
      return true;
    }
    return false;
  };

  /**
   * 处理外部数据更新
   */
  const handleExternalUpdate = (newValue: string[][]): void => {
    const currentData = getData();

    // 使用优化的比较函数
    if (isDataEqual(currentData, newValue)) {
      return; // 数据相同，无需更新
    }

    // 标记为外部更新，避免触发内部 watch
    isUpdatingFromExternal.value = true;
    setData(newValue);

    nextTick(() => {
      isUpdatingFromExternal.value = false;

      // 当外部数据更新时，重新初始化历史记录
      // 但如果正在撤销/重做，不要重新初始化（会清空历史）
      if (
        initHistory &&
        newValue.length > 0 &&
        (!isUndoRedoInProgress || !isUndoRedoInProgress()) &&
        !isInternalUpdateEmitted.value
      ) {
        initHistory(newValue);
      }
    });
  };

  /**
   * 初始化数据同步监听
   *
   * 简化逻辑：
   * 1. 内部数据变化 -> 通知外部（如果不在外部更新状态）
   * 2. 外部数据变化 -> 更新内部（如果数据不同）
   */
  const initDataSync = (): void => {
    // Watch 1: 监听内部数据变化，通知外部
    watch(
      tableData,
      () => {
        if (shouldSkipNotification()) {
          return;
        }
        // 使用 nextTick 确保所有数据更新完成后再通知
        nextTick(() => {
          emitSync();
        });
      },
      { deep: true }
    );

    // Watch 2: 监听外部数据变化，更新内部
    watch(
      () => props.modelValue,
      (newValue) => {
        // 只处理非 null 的数组数据
        if (props.modelValue !== null && Array.isArray(newValue)) {
          handleExternalUpdate(newValue);
        }
      },
      { deep: true, immediate: false }
    );
  };

  /**
   * 设置数据（带外部更新标记）
   * 用于程序化设置数据，确保正确同步
   */
  const setDataWithSync = (data: string[][]): void => {
    runExternalUpdate(() => setData(data), {
      emitSync: true,
      reinitHistory: true,
      data,
    });
  };

  return {
    emitSync,
    emitChange,
    emitModelUpdate,
    initDataSync,
    setDataWithSync,
    runExternalUpdate,
  };
}
