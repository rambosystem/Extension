import { ref, type Ref } from "vue";
import { DEFAULT_CONFIG } from "./constants";

/**
 * 历史记录 Composable 返回值
 */
export interface UseHistoryReturn {
  initHistory: (data: any) => void;
  saveHistory: (currentState: any) => void;
  undo: () => any | null;
  redo: () => any | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Excel 历史记录 Composable
 *
 * 用于通用组件 Excel 的内部状态管理
 *
 * 设计原则：
 * - 通用组件（Components/Common/）应该自包含，不依赖 Store
 * - 每个组件实例拥有独立的历史记录，保证组件的可复用性
 * - 这是通用组件的标准做法，符合组件化设计原则
 */
export function useHistory(
  maxHistorySize: number = DEFAULT_CONFIG.MAX_HISTORY_SIZE
): UseHistoryReturn {
  const historyStack: Ref<any[]> = ref([]);
  const historyIndex = ref(-1);

  /**
   * 深拷贝辅助函数
   * 使用 JSON 序列化实现深拷贝（适用于简单数据结构）
   */
  const deepCopy = <T>(data: T): T => {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      console.error("Deep copy failed:", error);
      throw new Error(
        `Failed to deep copy data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  /**
   * 初始化历史记录
   */
  const initHistory = (data: any): void => {
    if (!data) {
      console.warn("initHistory: data is required");
      return;
    }
    historyStack.value = [deepCopy(data)];
    historyIndex.value = 0;
  };

  /**
   * 保存历史记录
   * 如果当前处于历史中间位置，会切断后面的记录
   */
  const saveHistory = (currentState: any): void => {
    if (!currentState) {
      console.warn("saveHistory: currentState is required");
      return;
    }

    // 如果当前处于历史中间位置，切断后面的记录
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
    }

    const lastState = historyStack.value[historyStack.value.length - 1];
    const newState = deepCopy(currentState);

    // 避免重复保存相同状态
    try {
      if (lastState && JSON.stringify(lastState) === JSON.stringify(newState)) {
        return;
      }
    } catch (error) {
      console.warn("Failed to compare states:", error);
      // 继续保存，即使比较失败
    }

    historyStack.value.push(newState);

    if (historyStack.value.length > maxHistorySize) {
      historyStack.value.shift();
      // 注意：当移除第一个元素时，索引不需要改变
    } else {
      historyIndex.value++;
    }
  };

  /**
   * 撤销操作
   */
  const undo = (): any | null => {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      return deepCopy(historyStack.value[historyIndex.value]);
    }
    return null;
  };

  /**
   * 重做操作
   */
  const redo = (): any | null => {
    if (historyIndex.value < historyStack.value.length - 1) {
      historyIndex.value++;
      return deepCopy(historyStack.value[historyIndex.value]);
    }
    return null;
  };

  return {
    initHistory,
    saveHistory,
    undo,
    redo,
    canUndo: () => historyIndex.value > 0,
    canRedo: () => historyIndex.value < historyStack.value.length - 1,
  };
}
