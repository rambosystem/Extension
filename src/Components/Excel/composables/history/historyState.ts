import { ref, type Ref } from "vue";

export interface HistoryState {
  historyEntries: Ref<any[]>;
  historyIndex: Ref<number>;
  getUndoRedoInProgress: () => boolean;
  setUndoRedoInProgress: (value: boolean) => void;
  config: {
    MERGE_TIME_WINDOW: number;
    CHECKPOINT_INTERVAL: number;
    MAX_HISTORY_ENTRIES: number;
  };
}

export const createHistoryState = (maxHistorySize: number): HistoryState => {
  const historyEntries = ref<any[]>([]);
  const historyIndex = ref(-1);
  let isUndoRedoInProgress = false;

  const MERGE_TIME_WINDOW = 500;
  const CHECKPOINT_INTERVAL = 10;
  const MAX_HISTORY_ENTRIES = maxHistorySize;

  return {
    historyEntries,
    historyIndex,
    getUndoRedoInProgress: () => isUndoRedoInProgress,
    setUndoRedoInProgress: (value: boolean) => {
      isUndoRedoInProgress = value;
    },
    config: {
      MERGE_TIME_WINDOW,
      CHECKPOINT_INTERVAL,
      MAX_HISTORY_ENTRIES,
    },
  };
};
