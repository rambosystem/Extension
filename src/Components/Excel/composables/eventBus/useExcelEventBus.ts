import type { SelectionRange } from "../types";

export type ExcelEventName =
  | "change"
  | "modelUpdate"
  | "selection"
  | "history";

export interface ExcelEventPayloads {
  change: { data: string[][] };
  modelUpdate: { data: string[][] };
  selection: { action: string; range?: SelectionRange | null };
  history: { action: string; info?: Record<string, unknown> };
}

type ExcelEventHandler<T extends ExcelEventName> = (
  payload: ExcelEventPayloads[T]
) => void;

export interface ExcelEventBus {
  on: <T extends ExcelEventName>(
    event: T,
    handler: ExcelEventHandler<T>
  ) => void;
  off: <T extends ExcelEventName>(
    event: T,
    handler: ExcelEventHandler<T>
  ) => void;
  emit: <T extends ExcelEventName>(
    event: T,
    payload: ExcelEventPayloads[T]
  ) => void;
}

export const createExcelEventBus = (): ExcelEventBus => {
  const listeners = new Map<ExcelEventName, Set<Function>>();

  const on = <T extends ExcelEventName>(
    event: T,
    handler: ExcelEventHandler<T>
  ): void => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler as Function);
  };

  const off = <T extends ExcelEventName>(
    event: T,
    handler: ExcelEventHandler<T>
  ): void => {
    const set = listeners.get(event);
    if (set) {
      set.delete(handler as Function);
    }
  };

  const emit = <T extends ExcelEventName>(
    event: T,
    payload: ExcelEventPayloads[T]
  ): void => {
    const set = listeners.get(event);
    if (!set || set.size === 0) {
      return;
    }
    set.forEach((handler) => {
      (handler as ExcelEventHandler<T>)(payload);
    });
  };

  return {
    on,
    off,
    emit,
  };
};
