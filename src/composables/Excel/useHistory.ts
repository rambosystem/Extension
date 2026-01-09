import { ref, nextTick, type Ref } from "vue";
import { DEFAULT_CONFIG } from "./constants";
import {
  debugLog,
  debugInfo,
  debugWarn,
  debugError,
} from "../../utils/debug.js";

/**
 * 操作类型枚举
 */
export enum HistoryActionType {
  CELL_EDIT = "cell_edit",
  CELL_BATCH_EDIT = "cell_batch_edit",
  ROW_INSERT = "row_insert",
  ROW_DELETE = "row_delete",
  FILL = "fill",
  DELETE = "delete",
  BULK_OPERATION = "bulk_operation",
  UNKNOWN = "unknown",
}

/**
 * 单元格变化记录
 */
export interface CellChange {
  row: number;
  col: number;
  oldValue: string;
  newValue: string;
}

/**
 * 历史记录项
 */
export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  timestamp: number;
  description?: string;

  // 增量快照（用于小范围操作）
  delta?: {
    changes: CellChange[];
  };

  // 完整快照（用于大范围操作或作为检查点）
  snapshot?: string[][];

  // 元数据
  metadata?: {
    affectedCells?: number;
    [key: string]: any;
  };
}

/**
 * 历史记录 Composable 返回值
 */
export interface UseHistoryReturn {
  initHistory: (data: any) => void;
  saveHistory: (currentState: any, options?: SaveHistoryOptions) => void;
  undo: () => any | null;
  redo: () => any | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // 新增 API
  getHistoryInfo: () => HistoryInfo;
  clearHistory: () => void;
  getHistoryEntries: () => HistoryEntry[];
}

/**
 * 保存历史记录选项
 */
export interface SaveHistoryOptions {
  type?: HistoryActionType;
  description?: string;
  forceFullSnapshot?: boolean; // 强制使用完整快照
  changes?: CellChange[]; // 提供变化列表以优化性能
  metadata?: Record<string, any>;
}

/**
 * 历史记录信息
 */
export interface HistoryInfo {
  totalEntries: number;
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Excel 历史记录 Composable (重构版)
 *
 * 改进点：
 * 1. 使用增量快照 + 完整快照混合模式
 * 2. 优化的深拷贝实现（结构化克隆优先）
 * 3. 修复索引管理缺陷
 * 4. 操作合并机制
 * 5. 优化的状态比较
 * 6. 检查点机制
 */
export function useHistory(
  maxHistorySize: number = DEFAULT_CONFIG.MAX_HISTORY_SIZE
): UseHistoryReturn {
  const historyEntries: Ref<HistoryEntry[]> = ref([]);
  const historyIndex = ref(-1);
  let isUndoRedoInProgress = false;

  // 操作合并配置
  const MERGE_TIME_WINDOW = 500; // 500ms 内的操作可以合并
  const CHECKPOINT_INTERVAL = 10; // 每 10 个增量操作后创建检查点

  /**
   * 优化的深拷贝实现
   * 优先级：JSON 序列化（处理 Vue 响应式对象）> 数组展开 > 结构化克隆
   *
   * 注意：Vue 的响应式对象（Proxy）无法被 structuredClone 克隆，
   * 所以优先使用 JSON 序列化来确保得到纯数据
   */
  const optimizedDeepCopy = <T>(data: T): T => {
    if (!data) {
      debugError(
        "[History] optimizedDeepCopy: data is null or undefined",
        data
      );
      return data;
    }

    // 1. 对于字符串二维数组（Excel 数据），优先使用 JSON 序列化
    // 这样可以正确处理 Vue 的响应式对象（Proxy）
    if (Array.isArray(data)) {
      try {
        // 先尝试 JSON 序列化（可以处理 Vue Proxy）
        const jsonString = JSON.stringify(data);
        const cloned = JSON.parse(jsonString);
        if (cloned === null || cloned === undefined) {
          throw new Error("JSON serialization returned null/undefined");
        }
        // 验证结果是否为有效的二维数组
        if (
          Array.isArray(cloned) &&
          cloned.every((row) => Array.isArray(row))
        ) {
          return cloned as T;
        }
      } catch (error) {
        debugLog(
          "[History] optimizedDeepCopy: JSON serialization failed, trying array spread",
          error
        );
      }

      // 2. 回退到数组展开方法（如果 JSON 失败）
      try {
        if (
          data.every(
            (row) =>
              Array.isArray(row) &&
              row.every((cell) => typeof cell === "string")
          )
        ) {
          const cloned = data.map((row) => {
            // 确保行是普通数组，不是 Proxy
            if (Array.isArray(row)) {
              return [...row];
            }
            return [];
          }) as T;
          if (!Array.isArray(cloned)) {
            throw new Error("Array map failed to return array");
          }
          return cloned;
        }
      } catch (error) {
        debugLog(
          "[History] optimizedDeepCopy: array spread failed, trying structuredClone",
          error
        );
      }
    }

    // 3. 尝试使用结构化克隆 API（对于非响应式对象）
    if (typeof structuredClone !== "undefined") {
      try {
        const cloned = structuredClone(data);
        if (cloned === null || cloned === undefined) {
          throw new Error("structuredClone returned null/undefined");
        }
        return cloned;
      } catch (error) {
        // 结构化克隆失败，继续尝试 JSON
        debugLog(
          "[History] optimizedDeepCopy: structuredClone failed, trying JSON",
          error
        );
      }
    }

    // 4. 最终回退到 JSON 序列化（兼容性最好）
    try {
      const cloned = JSON.parse(JSON.stringify(data));
      if (cloned === null || cloned === undefined) {
        throw new Error("JSON serialization returned null/undefined");
      }
      return cloned;
    } catch (error) {
      debugError("[History] optimizedDeepCopy: all methods failed", error);
      throw new Error(
        `Failed to deep copy data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  /**
   * 快速状态比较
   * 如果提供了变化列表，只比较这些位置
   */
  const quickStateCompare = (
    oldState: string[][],
    newState: string[][],
    changes?: CellChange[]
  ): boolean => {
    // 如果提供了变化列表，只比较这些位置
    if (changes && changes.length > 0) {
      return changes.every((change) => {
        const oldVal = oldState[change.row]?.[change.col] ?? "";
        const newVal = newState[change.row]?.[change.col] ?? "";
        return oldVal === change.oldValue && newVal === change.newValue;
      });
    }

    // 快速长度检查
    if (oldState.length !== newState.length) return false;

    // 对于大数据，可以进一步优化：只比较非空单元格
    // 这里为了简单，使用 JSON 比较（但已经比每次都比较快）
    try {
      return JSON.stringify(oldState) === JSON.stringify(newState);
    } catch (error) {
      debugWarn("[History] quickStateCompare: failed", error);
      return false;
    }
  };

  /**
   * 检测数据变化（如果未提供变化列表）
   */
  const detectChanges = (
    oldState: string[][],
    newState: string[][]
  ): CellChange[] => {
    const changes: CellChange[] = [];
    const maxRows = Math.max(oldState.length, newState.length);

    for (let row = 0; row < maxRows; row++) {
      const oldRow = oldState[row] || [];
      const newRow = newState[row] || [];
      const maxCols = Math.max(oldRow.length, newRow.length);

      for (let col = 0; col < maxCols; col++) {
        const oldVal = oldRow[col] ?? "";
        const newVal = newRow[col] ?? "";
        if (oldVal !== newVal) {
          changes.push({ row, col, oldValue: oldVal, newValue: newVal });
        }
      }
    }

    return changes;
  };

  /**
   * 判断是否应该创建检查点
   */
  const shouldCreateCheckpoint = (): boolean => {
    let incrementalCount = 0;
    for (let i = historyIndex.value; i >= 0; i--) {
      const entry = historyEntries.value[i];
      if (!entry || entry.snapshot) break; // 遇到检查点就停止
      incrementalCount++;
    }
    return incrementalCount >= CHECKPOINT_INTERVAL;
  };

  /**
   * 判断是否可以合并操作
   */
  const canMergeOperation = (
    lastEntry: HistoryEntry | undefined,
    newType: HistoryActionType,
    newTimestamp: number
  ): boolean => {
    if (!lastEntry) return false;

    // 只有相同类型的操作才能合并
    if (lastEntry.type !== newType) return false;

    // 检查时间窗口
    const timeDiff = newTimestamp - lastEntry.timestamp;
    if (timeDiff > MERGE_TIME_WINDOW) return false;

    // 只有单元格编辑可以合并
    return newType === HistoryActionType.CELL_EDIT;
  };

  /**
   * 合并操作到上一个历史记录
   */
  const mergeOperation = (
    lastEntry: HistoryEntry,
    changes: CellChange[]
  ): void => {
    if (!lastEntry.delta) {
      lastEntry.delta = { changes: [] };
    }

    const initialChangesCount = lastEntry.delta.changes.length;
    let updatedCount = 0;
    let addedCount = 0;

    // 合并变化：相同单元格的变化合并，不同单元格的变化追加
    changes.forEach((change) => {
      const existingIndex = lastEntry.delta!.changes.findIndex(
        (c) => c.row === change.row && c.col === change.col
      );

      if (existingIndex >= 0) {
        // 更新现有变化（保留原始 oldValue）
        lastEntry.delta!.changes[existingIndex].newValue = change.newValue;
        updatedCount++;
      } else {
        // 添加新变化
        lastEntry.delta!.changes.push(change);
        addedCount++;
      }
    });

    // 更新元数据
    if (lastEntry.metadata) {
      lastEntry.metadata.affectedCells = lastEntry.delta.changes.length;
    }

    debugLog("[History] mergeOperation: completed", {
      entryId: lastEntry.id,
      initialChanges: initialChangesCount,
      newChanges: changes.length,
      updated: updatedCount,
      added: addedCount,
      totalChanges: lastEntry.delta.changes.length,
    });
  };

  /**
   * 应用增量快照到状态
   */
  const applyDelta = (
    state: string[][],
    delta: { changes: CellChange[] }
  ): string[][] => {
    if (!state || !Array.isArray(state)) {
      debugError("[History] applyDelta: invalid state", state);
      return [[]];
    }

    const result = optimizedDeepCopy(state);

    if (!result || !Array.isArray(result)) {
      debugError("[History] applyDelta: failed to copy state", result);
      return [[]];
    }

    // 确保 result 是有效的二维数组
    if (result.length === 0) {
      result.push([]);
    }

    delta.changes.forEach((change) => {
      // 确保行存在
      while (result.length <= change.row) {
        result.push([]);
      }

      // 确保行是数组
      if (!result[change.row] || !Array.isArray(result[change.row])) {
        result[change.row] = [];
      }

      // 确保列存在
      while (result[change.row].length <= change.col) {
        result[change.row].push("");
      }

      result[change.row][change.col] = String(change.newValue ?? "");
    });

    // 最终验证：确保所有行都是有效的数组
    const validatedResult: string[][] = [];
    for (let i = 0; i < result.length; i++) {
      const row = result[i];
      if (row === null || row === undefined) {
        validatedResult.push([]);
      } else if (Array.isArray(row)) {
        validatedResult.push(row.map((cell) => String(cell ?? "")));
      } else {
        debugWarn("[History] applyDelta: invalid row type", {
          rowIndex: i,
          rowType: typeof row,
        });
        validatedResult.push([]);
      }
    }

    // 确保至少有一行
    if (validatedResult.length === 0) {
      validatedResult.push([]);
    }

    return validatedResult;
  };

  /**
   * 获取当前完整状态（从检查点 + 增量操作重建）
   */
  const getCurrentFullState = (): string[][] | null => {
    if (
      historyIndex.value < 0 ||
      historyIndex.value >= historyEntries.value.length
    ) {
      debugLog("[History] getCurrentFullState: invalid index", {
        historyIndex: historyIndex.value,
        entriesLength: historyEntries.value.length,
      });
      return null;
    }

    // 找到最近的检查点
    let checkpointIndex = -1;
    let checkpointState: string[][] | null = null;

    for (let i = historyIndex.value; i >= 0; i--) {
      const entry = historyEntries.value[i];
      if (entry?.snapshot) {
        checkpointIndex = i;
        try {
          checkpointState = optimizedDeepCopy(entry.snapshot);
          if (!checkpointState || !Array.isArray(checkpointState)) {
            debugError(
              "[History] getCurrentFullState: checkpoint snapshot is invalid",
              {
                checkpointIndex: i,
                entryId: entry.id,
              }
            );
            return null;
          }
        } catch (error) {
          debugError(
            "[History] getCurrentFullState: failed to copy checkpoint",
            {
              checkpointIndex: i,
              entryId: entry.id,
              error,
            }
          );
          return null;
        }
        break;
      }
    }

    // 如果没有检查点，返回 null（应该不会发生，因为初始化会创建检查点）
    if (!checkpointState || !Array.isArray(checkpointState)) {
      debugError("[History] getCurrentFullState: no valid checkpoint found", {
        historyIndex: historyIndex.value,
        entriesLength: historyEntries.value.length,
      });
      return null;
    }

    // 从检查点应用所有后续的增量操作
    for (let i = checkpointIndex + 1; i <= historyIndex.value; i++) {
      const entry = historyEntries.value[i];
      if (entry?.delta) {
        try {
          const newState = applyDelta(checkpointState, entry.delta);
          if (!newState || !Array.isArray(newState)) {
            debugError(
              "[History] getCurrentFullState: applyDelta returned invalid state",
              {
                checkpointIndex,
                entryIndex: i,
                entryId: entry.id,
              }
            );
            return null;
          }
          checkpointState = newState;
        } catch (error) {
          debugError("[History] getCurrentFullState: applyDelta failed", {
            checkpointIndex,
            entryIndex: i,
            entryId: entry.id,
            error,
          });
          return null;
        }
      }
    }

    // 最终验证返回的状态，确保是有效的二维数组
    if (!checkpointState || !Array.isArray(checkpointState)) {
      debugError("[History] getCurrentFullState: final state is invalid", {
        checkpointIndex,
        historyIndex: historyIndex.value,
      });
      return null;
    }

    // 确保每一行都是有效的数组
    const validatedState: string[][] = [];
    for (let i = 0; i < checkpointState.length; i++) {
      const row = checkpointState[i];
      if (row === null || row === undefined) {
        // 如果行是 null 或 undefined，创建空数组
        debugWarn(
          "[History] getCurrentFullState: row is null/undefined, creating empty row",
          {
            rowIndex: i,
          }
        );
        validatedState.push([]);
      } else if (Array.isArray(row)) {
        // 确保每个单元格都是字符串
        validatedState.push(row.map((cell) => String(cell ?? "")));
      } else {
        // 如果行不是数组，创建一个空数组
        debugWarn(
          "[History] getCurrentFullState: row is not an array, creating empty row",
          {
            rowIndex: i,
            row,
            rowType: typeof row,
          }
        );
        validatedState.push([]);
      }
    }

    // 最终验证：确保至少有一行
    if (validatedState.length === 0) {
      debugWarn(
        "[History] getCurrentFullState: validated state is empty, adding empty row"
      );
      validatedState.push([]);
    }

    debugLog("[History] getCurrentFullState: returning validated state", {
      rows: validatedState.length,
      firstRowLength: validatedState[0]?.length,
      checkpointIndex,
      historyIndex: historyIndex.value,
    });

    return validatedState;
  };

  /**
   * 初始化历史记录
   */
  const initHistory = (data: any): void => {
    if (!data) {
      debugWarn("[History] initHistory: data is required");
      return;
    }

    const initialState = optimizedDeepCopy(data);
    const entry: HistoryEntry = {
      id: `init-${Date.now()}`,
      type: HistoryActionType.UNKNOWN,
      timestamp: Date.now(),
      description: "Initial state",
      snapshot: initialState,
      metadata: {},
    };

    historyEntries.value = [entry];
    historyIndex.value = 0;

    debugLog("[History] Initialized", {
      entryId: entry.id,
      timestamp: entry.timestamp,
      snapshotSize: `${initialState.length} rows`,
    });
  };

  /**
   * 保存历史记录
   */
  const saveHistory = (
    currentState: any,
    options: SaveHistoryOptions = {}
  ): void => {
    // 获取调用栈信息（仅用于调试）
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split("\n")[2]?.trim() || "unknown";

    if (!currentState) {
      debugWarn("[History] saveHistory: currentState is required");
      return;
    }

    // 如果正在进行撤销/重做操作，不保存历史记录
    if (isUndoRedoInProgress) {
      debugLog("[History] saveHistory: skipped (undo/redo in progress)");
      return;
    }

    const actionType = options.type || HistoryActionType.UNKNOWN;
    const timestamp = Date.now();

    debugLog("[History] saveHistory: called", {
      actionType,
      hasChanges: !!options.changes?.length,
      changesCount: options.changes?.length || 0,
      description: options.description,
      caller: caller.substring(0, 100), // 限制长度
    });

    // 获取上一个状态
    const lastFullState = getCurrentFullState();
    if (!lastFullState) {
      // 如果没有历史记录，初始化
      debugLog("[History] saveHistory: no history found, initializing");
      initHistory(currentState);
      return;
    }

    // 检测或使用提供的变化列表
    let changes: CellChange[] = [];
    if (options.changes && options.changes.length > 0) {
      changes = options.changes;
    } else {
      changes = detectChanges(lastFullState, currentState);
    }

    // 如果没有变化，不保存
    if (changes.length === 0) {
      debugLog("[History] saveHistory: no changes detected, skipped");
      return;
    }

    // 快速状态比较（避免重复保存）
    if (
      !options.forceFullSnapshot &&
      !quickStateCompare(lastFullState, currentState, changes)
    ) {
      // 状态确实有变化，继续保存
    }

    // 判断是否应该合并操作
    const lastEntry = historyEntries.value[historyIndex.value];
    if (canMergeOperation(lastEntry, actionType, timestamp)) {
      debugLog("[History] saveHistory: merging operation", {
        actionType,
        changesCount: changes.length,
        lastEntryId: lastEntry.id,
      });
      mergeOperation(lastEntry, changes);
      return; // 合并完成，不需要创建新记录
    }

    // 判断是否应该创建检查点
    const shouldCheckpoint =
      shouldCreateCheckpoint() || options.forceFullSnapshot;

    // 如果当前不在末尾，切断后续记录
    if (historyIndex.value < historyEntries.value.length - 1) {
      const removedCount = historyEntries.value.length - historyIndex.value - 1;
      debugLog("[History] saveHistory: truncating future history", {
        removedEntries: removedCount,
      });
      historyEntries.value = historyEntries.value.slice(
        0,
        historyIndex.value + 1
      );
    }

    // 创建新的历史记录
    const newEntry: HistoryEntry = {
      id: `${actionType}-${timestamp}-${Math.random()
        .toString(36)
        .slice(2, 11)}`,
      type: actionType,
      timestamp,
      description: options.description,
      metadata: {
        affectedCells: changes.length,
        ...options.metadata,
      },
    };

    if (shouldCheckpoint) {
      // 创建完整快照
      newEntry.snapshot = optimizedDeepCopy(currentState);
      debugInfo("[History] saveHistory: checkpoint created", {
        entryId: newEntry.id,
        actionType,
        changesCount: changes.length,
        snapshotSize: `${currentState.length} rows`,
      });
    } else {
      // 创建增量快照
      newEntry.delta = { changes };
      debugLog("[History] saveHistory: delta entry created", {
        entryId: newEntry.id,
        actionType,
        changesCount: changes.length,
        description: options.description,
      });
    }

    historyEntries.value.push(newEntry);
    historyIndex.value++;

    // 处理大小限制
    if (historyEntries.value.length > maxHistorySize) {
      const removedEntry = historyEntries.value.shift();
      historyIndex.value--; // ✅ 修复：索引需要减1
      debugLog(
        "[History] saveHistory: history size limit reached, removed oldest entry",
        {
          removedEntryId: removedEntry?.id,
          currentSize: historyEntries.value.length,
          maxSize: maxHistorySize,
        }
      );
    }
  };

  /**
   * 撤销操作
   */
  const undo = (): any | null => {
    if (historyIndex.value <= 0) {
      debugLog("[History] undo: cannot undo, already at initial state");
      return null;
    }

    isUndoRedoInProgress = true;
    try {
      const previousIndex = historyIndex.value;
      const previousEntry = historyEntries.value[previousIndex];

      historyIndex.value--;
      const targetEntry = historyEntries.value[historyIndex.value];

      const result = getCurrentFullState();

      debugLog("[History] undo: executed", {
        fromIndex: previousIndex,
        toIndex: historyIndex.value,
        fromEntryId: previousEntry?.id,
        toEntryId: targetEntry?.id,
        fromType: previousEntry?.type,
        toType: targetEntry?.type,
      });

      if (!result || !Array.isArray(result)) {
        debugError("[History] undo: invalid result from getCurrentFullState");
        // 恢复索引
        historyIndex.value = previousIndex;
        isUndoRedoInProgress = false;
        return null;
      }

      // 验证结果的有效性
      if (result.length === 0) {
        return [[]];
      }

      // 确保每一行都是有效的数组
      for (let i = 0; i < result.length; i++) {
        if (!Array.isArray(result[i])) {
          result[i] = [];
        }
      }

      nextTick(() => {
        isUndoRedoInProgress = false;
      });

      return result;
    } catch (error) {
      isUndoRedoInProgress = false;
      debugError("[History] undo: failed", error);
      throw error;
    }
  };

  /**
   * 重做操作
   */
  const redo = (): any | null => {
    if (historyIndex.value >= historyEntries.value.length - 1) {
      debugLog("[History] redo: cannot redo, already at latest state");
      return null;
    }

    isUndoRedoInProgress = true;
    try {
      const previousIndex = historyIndex.value;
      const previousEntry = historyEntries.value[previousIndex];
      historyIndex.value++;
      const result = getCurrentFullState();
      const currentEntry = historyEntries.value[historyIndex.value];

      debugLog("[History] redo: executed", {
        fromIndex: previousIndex,
        toIndex: historyIndex.value,
        fromEntryId: previousEntry?.id,
        toEntryId: currentEntry?.id,
        fromType: previousEntry?.type,
        toType: currentEntry?.type,
        resultValid: result !== null && Array.isArray(result),
        resultLength: result?.length,
      });

      if (!result || !Array.isArray(result)) {
        debugError(
          "[History] redo: getCurrentFullState returned invalid result",
          {
            result,
            historyIndex: historyIndex.value,
            entriesLength: historyEntries.value.length,
          }
        );
        // 恢复索引
        historyIndex.value = previousIndex;
        isUndoRedoInProgress = false;
        return null;
      }

      // 验证结果的有效性
      if (result.length === 0) {
        debugWarn(
          "[History] redo: result is empty array, returning empty state"
        );
        return [[]];
      }

      // 确保每一行都是有效的数组
      for (let i = 0; i < result.length; i++) {
        if (!Array.isArray(result[i])) {
          debugError("[History] redo: invalid row in result", {
            rowIndex: i,
            row: result[i],
          });
          // 修复无效的行
          result[i] = [];
        }
      }

      nextTick(() => {
        isUndoRedoInProgress = false;
      });

      return result;
    } catch (error) {
      isUndoRedoInProgress = false;
      debugError("[History] redo: failed", error);
      throw error;
    }
  };

  /**
   * 获取历史记录信息
   */
  const getHistoryInfo = (): HistoryInfo => {
    const info = {
      totalEntries: historyEntries.value.length,
      currentIndex: historyIndex.value,
      canUndo: historyIndex.value > 0,
      canRedo: historyIndex.value < historyEntries.value.length - 1,
    };
    debugLog("[History] getHistoryInfo", info);
    return info;
  };

  /**
   * 清空历史记录
   */
  const clearHistory = (): void => {
    const clearedCount = historyEntries.value.length;
    historyEntries.value = [];
    historyIndex.value = -1;
    debugInfo("[History] clearHistory: cleared all history", {
      clearedEntries: clearedCount,
    });
  };

  /**
   * 获取历史记录条目（只读）
   */
  const getHistoryEntries = (): HistoryEntry[] => {
    return [...historyEntries.value];
  };

  return {
    initHistory,
    saveHistory,
    undo,
    redo,
    canUndo: () => historyIndex.value > 0,
    canRedo: () => historyIndex.value < historyEntries.value.length - 1,
    getHistoryInfo,
    clearHistory,
    getHistoryEntries,
  };
}
