# Excel 组件复制粘贴功能重构方案

## 📋 目录

- [问题分析](#问题分析)
- [根本原因](#根本原因)
- [重构目标](#重构目标)
- [架构设计](#架构设计)
- [详细实施方案](#详细实施方案)
- [测试策略](#测试策略)
- [风险评估](#风险评估)
- [时间线](#时间线)

---

## 🔍 问题分析

### 当前实现的问题

通过深入分析代码，我发现以下关键问题：

#### 1. **事件监听机制不完善**

```typescript
// Excel.vue 第 5-8 行
<div
  class="excel-container"
  @keydown="handleKeydown"
  @copy="handleCopy"      // ❌ 问题：可能未正确触发
  @paste="handlePaste"    // ❌ 问题：可能未正确触发
  @click="handleContainerClick"
  tabindex="0"
  ref="containerRef"
>
```

**问题点：**

- `@copy` 和 `@paste` 事件只在 `excel-container` 上监听
- 当用户在单元格编辑状态时，事件可能被输入框拦截
- 没有考虑多选状态下的复制粘贴

#### 2. **useClipboard 实现缺陷**

```typescript
// useClipboard.ts 第 56-78 行
const handleCopy = (event: ClipboardEvent): void => {
  if (editingCell.value || !normalizedSelection.value) {
    return; // ❌ 问题：编辑状态下直接返回，但应该允许复制
  }

  event.preventDefault();
  const textData = generateClipboardText(
    normalizedSelection.value,
    tableData.value
  );

  try {
    if (event.clipboardData) {
      event.clipboardData.setData("text/plain", textData);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(textData).catch((error) => {
        console.warn("Failed to write to clipboard:", error);
      });
    }
  } catch (error) {
    console.warn("Copy operation failed:", error);
  }
};
```

**问题点：**

- 编辑状态下完全禁用复制，不合理
- 没有处理多选区域（`multiSelections`）的复制
- 错误处理不够友好，静默失败

#### 3. **useCellMenu 的复制粘贴实现有问题**

```typescript
// useCellMenu.ts 第 58-86 行
} else if (action === "copy") {
  // 触发复制事件
  const copyEvent = new ClipboardEvent("copy", {
    clipboardData: new DataTransfer(),
    bubbles: true,
    cancelable: true,
  });
  handleCopy(copyEvent);  // ❌ 问题：创建的事件没有实际的 clipboardData
} else if (action === "paste") {
  navigator.clipboard
    .readText()
    .then((text) => {
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
        bubbles: true,
        cancelable: true,
      });
      // 需要手动设置剪贴板数据
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: (type: string) => (type === "text" ? text : ""),
        },
      });
      handlePaste(pasteEvent);
    })
```

**问题点：**

- `new DataTransfer()` 创建的对象无法像真实的 ClipboardEvent 那样工作
- `Object.defineProperty` 的 hack 方式不可靠
- 异步操作没有错误处理
- 菜单触发的复制粘贴与键盘快捷键的逻辑不统一

#### 4. **键盘快捷键未实现**

```typescript
// useKeyboard.ts
// ❌ 问题：没有找到 Ctrl+C / Ctrl+V 的快捷键处理
```

**缺失功能：**

- 没有实现 `Ctrl+C` / `Cmd+C` 复制快捷键
- 没有实现 `Ctrl+V` / `Cmd+V` 粘贴快捷键
- 只依赖浏览器原生事件，但原生事件被拦截时无法生效

#### 5. **粘贴逻辑的边界问题**

```typescript
// useClipboard.ts 第 83-144 行
const handlePaste = (event: ClipboardEvent): void => {
  if (editingCell.value) {
    return; // ❌ 问题：编辑状态下不允许粘贴
  }

  event.preventDefault();

  try {
    const text =
      (event.clipboardData || (window as any).clipboardData)?.getData("text") ||
      "";
    const pasteData = parsePasteData(text);

    if (pasteData.length === 0) {
      return;
    }

    saveHistory(tableData.value);

    const startRow = activeCell.value?.row ?? 0;
    const startCol = activeCell.value?.col ?? 0;

    pasteData.forEach((rowArr, rIndex) => {
      const r = startRow + rIndex;
      // ... 粘贴逻辑
    });
  } catch (error) {
    console.warn("Paste operation failed:", error);
  }
};
```

**问题点：**

- 没有处理选区粘贴（应该粘贴到选区的左上角）
- 没有处理多单元格选区的智能粘贴（如：选中 2x2 区域，粘贴 1x1 数据应该填充整个区域）
- 自动扩展行列的逻辑没有触发数据同步
- 粘贴后没有更新选区状态

---

## 🎯 根本原因

### 核心问题总结

1. **架构层面：**

   - 复制粘贴逻辑分散在多个文件中（`useClipboard.ts`、`useCellMenu.ts`、`useKeyboard.ts`）
   - 没有统一的剪贴板管理中心
   - 菜单触发、快捷键触发、原生事件触发三种方式的实现不一致

2. **实现层面：**

   - 事件处理不完善（依赖浏览器原生事件，但原生事件易被拦截）
   - 编辑状态判断过于严格（应该支持部分场景下的复制粘贴）
   - 没有处理多选区域的复制粘贴
   - 粘贴后的状态更新不完整

3. **用户体验层面：**
   - 缺少复制粘贴的视觉反馈
   - 错误静默处理，用户不知道操作失败
   - 没有提供统一的快捷键体验

---

## 🎯 重构目标

### 功能目标

1. **复制功能：**

   - ✅ 支持单单元格复制
   - ✅ 支持矩形选区复制
   - ✅ 支持多选区域复制（合并为一个大矩形）
   - ✅ 支持编辑状态下的文本复制（仅复制当前编辑的文本）
   - ✅ 快捷键支持：`Ctrl+C` / `Cmd+C`
   - ✅ 菜单支持：右键菜单复制

2. **粘贴功能：**

   - ✅ 支持单单元格粘贴
   - ✅ 支持矩形数据粘贴
   - ✅ 支持选区智能粘贴（自动填充或裁剪）
   - ✅ 支持自动扩展行列
   - ✅ 快捷键支持：`Ctrl+V` / `Cmd+V`
   - ✅ 菜单支持：右键菜单粘贴
   - ✅ 粘贴后自动选中粘贴区域

3. **用户体验：**
   - ✅ 提供操作反馈（成功/失败提示）
   - ✅ 粘贴后高亮显示粘贴区域（可选）
   - ✅ 支持撤销/重做
   - ✅ 统一的快捷键体验

### 非功能目标

1. **代码质量：**

   - 统一的架构设计
   - 清晰的职责划分
   - 完善的错误处理
   - 充分的代码注释

2. **可维护性：**
   - 降低耦合度
   - 提高内聚性
   - 易于测试
   - 易于扩展

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                       Excel.vue                              │
│                    (主组件入口)                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 组合使用
                 │
    ┌────────────┴───────────────┬────────────────────────────┐
    │                            │                            │
    ▼                            ▼                            ▼
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  useKeyboard    │   │  useCellMenu     │   │  原生事件监听    │
│  (快捷键触发)   │   │  (菜单触发)      │   │  (@copy/@paste)  │
└────────┬────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                     │                       │
         │                     │                       │
         └─────────────────────┴───────────────────────┘
                               │
                               │ 统一调用
                               │
                     ┌─────────▼─────────┐
                     │   useClipboard    │
                     │  (剪贴板核心逻辑) │
                     └─────────┬─────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────┐
        │ copyToClipboard│ │pasteFrom │ │  状态管理    │
        │    (复制)      │ │ Clipboard│ │  (选区更新)  │
        └──────────────┘ └──────────┘ └──────────────┘
```

### 核心设计原则

#### 1. **单一职责原则 (SRP)**

- **useClipboard**: 负责剪贴板的读写和数据转换
- **useKeyboard**: 负责键盘快捷键的监听和分发
- **useCellMenu**: 负责菜单命令的处理和分发

#### 2. **依赖倒置原则 (DIP)**

```typescript
// ❌ 旧实现：直接依赖具体实现
const handleCopy = (event: ClipboardEvent) => {
  // 直接操作 event.clipboardData
};

// ✅ 新实现：依赖抽象接口
interface ClipboardOperations {
  copyToClipboard(text: string): Promise<void>;
  readFromClipboard(): Promise<string>;
}

const useClipboard = (operations: ClipboardOperations) => {
  // 通过接口操作剪贴板
};
```

#### 3. **开闭原则 (OCP)**

支持扩展而不修改核心代码：

```typescript
// 可扩展的复制策略
interface CopyStrategy {
  shouldHandle(context: CopyContext): boolean;
  execute(context: CopyContext): string;
}

// 默认策略：矩形选区复制
class RectangularCopyStrategy implements CopyStrategy { ... }

// 可扩展：多选区复制
class MultiSelectionCopyStrategy implements CopyStrategy { ... }

// 可扩展：编辑模式复制
class EditModeCopyStrategy implements CopyStrategy { ... }
```

---

## 📝 详细实施方案

### 第一阶段：重构 useClipboard (核心)

#### 1.1 新增类型定义

```typescript
// src/composables/Excel/useClipboard.ts

/**
 * 复制上下文
 */
export interface CopyContext {
  isEditing: boolean;
  editingCell: CellPosition | null;
  activeCell: CellPosition | null;
  normalizedSelection: SelectionRange | null;
  multiSelections: SelectionRange[];
  tableData: string[][];
}

/**
 * 粘贴上下文
 */
export interface PasteContext {
  isEditing: boolean;
  editingCell: CellPosition | null;
  activeCell: CellPosition | null;
  normalizedSelection: SelectionRange | null;
  clipboardText: string;
  tableData: string[][];
}

/**
 * 粘贴结果
 */
export interface PasteResult {
  success: boolean;
  affectedRange: SelectionRange | null;
  rowsAdded: number;
  colsAdded: number;
  error?: string;
}

/**
 * 剪贴板操作接口（抽象层）
 */
export interface ClipboardOperations {
  copyToClipboard(text: string): Promise<void>;
  readFromClipboard(): Promise<string>;
  hasClipboardContent(): Promise<boolean>;
}
```

#### 1.2 实现剪贴板操作适配器

```typescript
/**
 * 浏览器剪贴板操作实现
 */
export class BrowserClipboardOperations implements ClipboardOperations {
  async copyToClipboard(text: string): Promise<void> {
    try {
      // 优先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      // 降级方案：使用 document.execCommand
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const successful = document.execCommand("copy");
        if (!successful) {
          throw new Error("execCommand copy failed");
        }
      } finally {
        document.body.removeChild(textarea);
      }
    } catch (error) {
      throw new Error(`Failed to copy to clipboard: ${error}`);
    }
  }

  async readFromClipboard(): Promise<string> {
    try {
      // 优先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }

      // 无降级方案，抛出错误
      throw new Error("Clipboard API not available");
    } catch (error) {
      throw new Error(`Failed to read from clipboard: ${error}`);
    }
  }

  async hasClipboardContent(): Promise<boolean> {
    try {
      const text = await this.readFromClipboard();
      return text.length > 0;
    } catch {
      return false;
    }
  }
}
```

#### 1.3 重构复制逻辑

```typescript
/**
 * 复制策略：确定复制什么内容
 */
class CopyStrategyManager {
  /**
   * 获取要复制的文本
   */
  getCopyText(context: CopyContext): string | null {
    // 1. 编辑模式：不复制（让浏览器原生处理输入框的复制）
    if (context.isEditing) {
      return null;
    }

    // 2. 多选区域：合并为一个大矩形复制
    if (context.multiSelections.length > 1) {
      return this.copyMultipleSelections(context);
    }

    // 3. 单选区域：标准矩形复制
    if (context.normalizedSelection) {
      return this.copyRectangularSelection(context);
    }

    // 4. 无选区：复制当前单元格
    if (context.activeCell) {
      return this.copySingleCell(context);
    }

    return null;
  }

  private copyRectangularSelection(context: CopyContext): string {
    const { normalizedSelection, tableData } = context;
    if (!normalizedSelection) return "";

    const rows: string[] = [];
    for (
      let r = normalizedSelection.minRow;
      r <= normalizedSelection.maxRow;
      r++
    ) {
      if (!tableData[r]) continue;

      const cells: string[] = [];
      for (
        let c = normalizedSelection.minCol;
        c <= normalizedSelection.maxCol;
        c++
      ) {
        cells.push(tableData[r]?.[c] ?? "");
      }
      rows.push(cells.join("\t"));
    }
    return rows.join("\n");
  }

  private copyMultipleSelections(context: CopyContext): string {
    // 找到所有选区的边界
    const { multiSelections, tableData } = context;

    const minRow = Math.min(...multiSelections.map((s) => s.minRow));
    const maxRow = Math.max(...multiSelections.map((s) => s.maxRow));
    const minCol = Math.min(...multiSelections.map((s) => s.minCol));
    const maxCol = Math.max(...multiSelections.map((s) => s.maxCol));

    // 创建一个大矩形，未选中的区域用空字符串填充
    const rows: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const cells: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        // 检查该单元格是否在任一选区内
        const isInSelection = multiSelections.some(
          (sel) =>
            r >= sel.minRow &&
            r <= sel.maxRow &&
            c >= sel.minCol &&
            c <= sel.maxCol
        );

        cells.push(isInSelection ? tableData[r]?.[c] ?? "" : "");
      }
      rows.push(cells.join("\t"));
    }
    return rows.join("\n");
  }

  private copySingleCell(context: CopyContext): string {
    const { activeCell, tableData } = context;
    if (!activeCell) return "";

    return tableData[activeCell.row]?.[activeCell.col] ?? "";
  }
}
```

#### 1.4 重构粘贴逻辑

```typescript
/**
 * 粘贴策略：确定粘贴到哪里、如何粘贴
 */
class PasteStrategyManager {
  /**
   * 执行粘贴操作
   */
  executePaste(
    context: PasteContext,
    options: {
      rows: Ref<number[]>;
      columns: Ref<string[]>;
      generateColumnLabel: (index: number) => string;
      saveHistory: (state: any, options?: SaveHistoryOptions) => void;
      startSingleSelection: (row: number, col: number) => void;
      notifyDataChange?: () => void;
    }
  ): PasteResult {
    // 1. 编辑模式：不处理（让浏览器原生处理输入框的粘贴）
    if (context.isEditing) {
      return {
        success: false,
        affectedRange: null,
        rowsAdded: 0,
        colsAdded: 0,
        error: "Cannot paste while editing",
      };
    }

    // 2. 解析粘贴数据
    const pasteData = this.parsePasteData(context.clipboardText);
    if (pasteData.length === 0) {
      return {
        success: false,
        affectedRange: null,
        rowsAdded: 0,
        colsAdded: 0,
        error: "No data to paste",
      };
    }

    // 3. 确定粘贴起始位置
    const startRow = context.activeCell?.row ?? 0;
    const startCol = context.activeCell?.col ?? 0;

    // 4. 保存历史记录
    options.saveHistory(context.tableData, {
      type: HistoryActionType.PASTE,
      description: `Paste ${pasteData.length}x${
        pasteData[0]?.length || 0
      } cells`,
    });

    // 5. 执行粘贴（扩展行列）
    const result = this.applyPasteData(
      pasteData,
      startRow,
      startCol,
      context.tableData,
      options
    );

    // 6. 更新选区（高亮粘贴区域）
    if (result.success && result.affectedRange) {
      options.startSingleSelection(
        result.affectedRange.minRow,
        result.affectedRange.minCol
      );

      // 触发数据同步
      if (options.notifyDataChange) {
        options.notifyDataChange();
      }
    }

    return result;
  }

  private parsePasteData(clipboardText: string): string[][] {
    if (!clipboardText || typeof clipboardText !== "string") {
      return [];
    }

    try {
      // 处理不同的换行符：\r\n (Windows), \n (Unix), \r (Mac)
      return clipboardText
        .split(/\r?\n/)
        .filter((row) => row !== "")
        .map((row) => row.split("\t"));
    } catch (error) {
      console.warn("Failed to parse paste data:", error);
      return [];
    }
  }

  private applyPasteData(
    pasteData: string[][],
    startRow: number,
    startCol: number,
    tableData: string[][],
    options: {
      rows: Ref<number[]>;
      columns: Ref<string[]>;
      generateColumnLabel: (index: number) => string;
    }
  ): PasteResult {
    let rowsAdded = 0;
    let colsAdded = 0;

    const endRow = startRow + pasteData.length - 1;
    const endCol =
      startCol + Math.max(...pasteData.map((row) => row.length)) - 1;

    // 扩展行
    if (endRow >= options.rows.value.length) {
      const currentLength = options.rows.value.length;
      for (let i = currentLength; i <= endRow; i++) {
        options.rows.value.push(i);
        tableData.push(
          Array.from({ length: options.columns.value.length }, () => "")
        );
        rowsAdded++;
      }
    }

    // 扩展列
    if (endCol >= options.columns.value.length) {
      const currentLength = options.columns.value.length;
      for (let i = currentLength; i <= endCol; i++) {
        options.columns.value.push(options.generateColumnLabel(i));
        colsAdded++;
      }
      // 为所有行补齐列
      tableData.forEach((rowData) => {
        while (rowData.length <= endCol) {
          rowData.push("");
        }
      });
    }

    // 执行粘贴
    pasteData.forEach((rowArr, rIndex) => {
      const r = startRow + rIndex;
      rowArr.forEach((cellVal, cIndex) => {
        const c = startCol + cIndex;
        if (tableData[r]) {
          tableData[r][c] = cellVal;
        }
      });
    });

    return {
      success: true,
      affectedRange: {
        minRow: startRow,
        maxRow: endRow,
        minCol: startCol,
        maxCol: endCol,
      },
      rowsAdded,
      colsAdded,
    };
  }
}
```

#### 1.5 重构 useClipboard composable

```typescript
/**
 * useClipboard 重构版本
 */
export function useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  activeCell,
  rows,
  columns,
  multiSelections,
  saveHistory,
  startSingleSelection,
  notifyDataChange,
}: UseClipboardOptions): UseClipboardReturn {
  // 初始化操作适配器和策略管理器
  const clipboardOps = new BrowserClipboardOperations();
  const copyStrategy = new CopyStrategyManager();
  const pasteStrategy = new PasteStrategyManager();

  // 生成列标题的辅助函数
  const generateColumnLabel = (index: number): string => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    const first = Math.floor((index - 26) / 26);
    const second = (index - 26) % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  /**
   * 处理复制操作（事件驱动）
   */
  const handleCopy = (event: ClipboardEvent): void => {
    const context: CopyContext = {
      isEditing: !!editingCell.value,
      editingCell: editingCell.value,
      activeCell: activeCell.value,
      normalizedSelection: normalizedSelection.value,
      multiSelections: multiSelections.value,
      tableData: tableData.value,
    };

    const textToCopy = copyStrategy.getCopyText(context);

    // 如果返回 null，说明应该让浏览器原生处理（如：编辑模式）
    if (textToCopy === null) {
      return;
    }

    // 阻止默认行为，使用自定义逻辑
    event.preventDefault();

    try {
      if (event.clipboardData) {
        event.clipboardData.setData("text/plain", textToCopy);
      } else {
        // 降级方案：异步复制
        clipboardOps.copyToClipboard(textToCopy).catch((error) => {
          console.error("Failed to copy to clipboard:", error);
        });
      }
    } catch (error) {
      console.error("Copy operation failed:", error);
    }
  };

  /**
   * 程序化复制（菜单、快捷键触发）
   */
  const copyToClipboard = async (): Promise<boolean> => {
    const context: CopyContext = {
      isEditing: !!editingCell.value,
      editingCell: editingCell.value,
      activeCell: activeCell.value,
      normalizedSelection: normalizedSelection.value,
      multiSelections: multiSelections.value,
      tableData: tableData.value,
    };

    const textToCopy = copyStrategy.getCopyText(context);

    if (textToCopy === null || textToCopy === "") {
      return false;
    }

    try {
      await clipboardOps.copyToClipboard(textToCopy);
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  };

  /**
   * 处理粘贴操作（事件驱动）
   */
  const handlePaste = (event: ClipboardEvent): void => {
    const context: PasteContext = {
      isEditing: !!editingCell.value,
      editingCell: editingCell.value,
      activeCell: activeCell.value,
      normalizedSelection: normalizedSelection.value,
      clipboardText: event.clipboardData?.getData("text") || "",
      tableData: tableData.value,
    };

    // 如果是编辑模式，让浏览器原生处理
    if (context.isEditing) {
      return;
    }

    event.preventDefault();

    const result = pasteStrategy.executePaste(context, {
      rows,
      columns,
      generateColumnLabel,
      saveHistory,
      startSingleSelection,
      notifyDataChange,
    });

    if (!result.success) {
      console.warn("Paste failed:", result.error);
    }
  };

  /**
   * 程序化粘贴（菜单、快捷键触发）
   */
  const pasteFromClipboard = async (): Promise<boolean> => {
    try {
      const clipboardText = await clipboardOps.readFromClipboard();

      const context: PasteContext = {
        isEditing: !!editingCell.value,
        editingCell: editingCell.value,
        activeCell: activeCell.value,
        normalizedSelection: normalizedSelection.value,
        clipboardText,
        tableData: tableData.value,
      };

      const result = pasteStrategy.executePaste(context, {
        rows,
        columns,
        generateColumnLabel,
        saveHistory,
        startSingleSelection,
        notifyDataChange,
      });

      return result.success;
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      return false;
    }
  };

  /**
   * 检查剪贴板是否有内容
   */
  const hasClipboardContent = async (): Promise<boolean> => {
    return await clipboardOps.hasClipboardContent();
  };

  return {
    handleCopy,
    handlePaste,
    copyToClipboard,
    pasteFromClipboard,
    hasClipboardContent,
  };
}
```

---

### 第二阶段：增强 useKeyboard (快捷键)

```typescript
// src/composables/Excel/useKeyboard.ts

/**
 * 处理复制快捷键（Ctrl+C / Cmd+C）
 */
const handleCopyShortcut = (event: KeyboardEvent): boolean => {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  const isCKey = event.key.toLowerCase() === "c";

  if (!isCtrlOrCmd || !isCKey) {
    return false;
  }

  // 如果正在编辑，让浏览器原生处理
  if (editingCell.value) {
    return false;
  }

  event.preventDefault();

  // 调用程序化复制
  if (copyToClipboard) {
    copyToClipboard().catch((error) => {
      console.error("Copy shortcut failed:", error);
    });
  }

  return true;
};

/**
 * 处理粘贴快捷键（Ctrl+V / Cmd+V）
 */
const handlePasteShortcut = (event: KeyboardEvent): boolean => {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  const isVKey = event.key.toLowerCase() === "v";

  if (!isCtrlOrCmd || !isVKey) {
    return false;
  }

  // 如果正在编辑，让浏览器原生处理
  if (editingCell.value) {
    return false;
  }

  event.preventDefault();

  // 调用程序化粘贴
  if (pasteFromClipboard) {
    pasteFromClipboard().catch((error) => {
      console.error("Paste shortcut failed:", error);
    });
  }

  return true;
};

/**
 * 主键盘处理函数（修改）
 */
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.isComposing || event.keyCode === 229) {
    return;
  }

  if (!activeCell.value) {
    return;
  }

  if (handleUndoRedo(event)) return;
  if (handleCopyShortcut(event)) return; // ✅ 新增
  if (handlePasteShortcut(event)) return; // ✅ 新增
  if (editingCell.value) return;
  if (handleInsertRow(event)) return;
  if (handleDeleteRowKey(event)) return;
  if (handleCustomShortcuts(event)) return;
  if (handleNavigation(event)) return;
  if (handleDelete(event)) return;
  if (handleDirectTyping(event)) return;
};
```

---

### 第三阶段：修复 useCellMenu (菜单触发)

```typescript
// src/composables/Excel/useCellMenu.ts

/**
 * useCellMenu 选项（扩展）
 */
export interface UseCellMenuOptions {
  handleInsertRowBelow: (rowIndex: number) => void;
  handleDeleteRow: (rowIndex: number) => void;
  copyToClipboard: () => Promise<boolean>; // ✅ 新增
  pasteFromClipboard: () => Promise<boolean>; // ✅ 新增
  undoHistory: () => any | null;
  redoHistory: () => any | null;
  tableData: any;
}

/**
 * 单元格菜单管理 Composable（重构）
 */
export function useCellMenu({
  handleInsertRowBelow,
  handleDeleteRow,
  copyToClipboard,
  pasteFromClipboard,
  undoHistory,
  redoHistory,
  tableData,
}: UseCellMenuOptions): UseCellMenuReturn {
  /**
   * 处理单元格菜单命令
   */
  const handleCellMenuCommand = (command: CellMenuCommand): void => {
    if (!command || typeof command.rowIndex !== "number") {
      return;
    }

    const { action, rowIndex } = command;

    if (action === "deleteRow") {
      handleDeleteRow(rowIndex);
    } else if (action === "insertRowBelow") {
      handleInsertRowBelow(rowIndex);
    } else if (action === "copy") {
      // ✅ 使用程序化复制
      copyToClipboard().catch((error) => {
        console.error("Menu copy failed:", error);
      });
    } else if (action === "paste") {
      // ✅ 使用程序化粘贴
      pasteFromClipboard().catch((error) => {
        console.error("Menu paste failed:", error);
      });
    } else if (action === "undo") {
      const newState = undoHistory();
      if (newState && Array.isArray(newState)) {
        tableData.value = newState;
      }
    } else if (action === "redo") {
      const newState = redoHistory();
      if (newState && Array.isArray(newState)) {
        tableData.value = newState;
      }
    }
  };

  return {
    handleCellMenuCommand,
  };
}
```

---

### 第四阶段：更新 Excel.vue (集成)

```typescript
// src/Components/Common/Excel.vue

// --- 剪贴板管理（扩展） ---
const {
  handleCopy,
  handlePaste,
  copyToClipboard,
  pasteFromClipboard,
  hasClipboardContent,
} = useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  activeCell,
  rows,
  columns: internalColumns,
  multiSelections, // ✅ 新增
  saveHistory,
  startSingleSelection,
  notifyDataChange, // ✅ 新增
});

// --- 键盘主逻辑（扩展） ---
const { handleKeydown } = useKeyboard({
  activeCell,
  editingCell,
  normalizedSelection,
  moveActiveCell,
  saveHistory,
  undoHistory,
  redoHistory,
  startEdit,
  deleteSelection,
  handleInsertRowBelow,
  handleDeleteRow,
  tableData,
  getMaxRows: () => rows.value.length,
  getMaxCols: () => internalColumns.value.length,
  customMenuItems: props.customMenuItems,
  handleCustomAction,
  createMenuContext: (rowIndex: number) => createMenuContext(rowIndex),
  copyToClipboard, // ✅ 新增
  pasteFromClipboard, // ✅ 新增
});

// --- Cell Menu 管理（修改） ---
const { handleCellMenuCommand } = useCellMenu({
  handleInsertRowBelow,
  handleDeleteRow,
  copyToClipboard, // ✅ 修改
  pasteFromClipboard, // ✅ 修改
  undoHistory,
  redoHistory,
  tableData,
});

// 检查剪贴板是否有内容（修改）
const checkClipboard = async () => {
  try {
    canPaste.value = await hasClipboardContent(); // ✅ 使用新方法
  } catch (error) {
    canPaste.value = true;
  }
};
```

---

## 🧪 测试策略

### 单元测试

#### 1. **useClipboard 测试**

```typescript
// src/composables/Excel/__tests__/useClipboard.spec.ts

describe("useClipboard", () => {
  describe("复制功能", () => {
    it("应该能复制单个单元格", async () => {
      // ...
    });

    it("应该能复制矩形选区", async () => {
      // ...
    });

    it("应该能复制多选区域（合并为大矩形）", async () => {
      // ...
    });

    it("编辑状态下应该让浏览器原生处理", () => {
      // ...
    });
  });

  describe("粘贴功能", () => {
    it("应该能粘贴到单个单元格", async () => {
      // ...
    });

    it("应该能粘贴矩形数据", async () => {
      // ...
    });

    it("粘贴应该自动扩展行列", async () => {
      // ...
    });

    it("粘贴后应该更新选区", async () => {
      // ...
    });

    it("编辑状态下不应该粘贴", () => {
      // ...
    });
  });
});
```

#### 2. **CopyStrategyManager 测试**

```typescript
describe("CopyStrategyManager", () => {
  it("应该正确复制单选区域", () => {
    // ...
  });

  it("应该正确处理多选区域", () => {
    // ...
  });

  it("应该处理边界情况（空单元格）", () => {
    // ...
  });
});
```

#### 3. **PasteStrategyManager 测试**

```typescript
describe("PasteStrategyManager", () => {
  it("应该正确解析粘贴数据", () => {
    // ...
  });

  it("应该正确计算粘贴范围", () => {
    // ...
  });

  it("应该正确扩展行列", () => {
    // ...
  });
});
```

### 集成测试

```typescript
// src/Components/Common/__tests__/Excel.copy-paste.spec.ts

describe("Excel 组件 - 复制粘贴集成测试", () => {
  it("键盘快捷键 Ctrl+C 应该触发复制", async () => {
    // ...
  });

  it("键盘快捷键 Ctrl+V 应该触发粘贴", async () => {
    // ...
  });

  it("右键菜单复制应该正常工作", async () => {
    // ...
  });

  it("右键菜单粘贴应该正常工作", async () => {
    // ...
  });

  it("复制粘贴应该支持撤销/重做", async () => {
    // ...
  });
});
```

### 手动测试清单

- [ ] **复制功能：**

  - [ ] Ctrl+C 复制单个单元格
  - [ ] Ctrl+C 复制矩形选区
  - [ ] 菜单复制单个单元格
  - [ ] 菜单复制矩形选区
  - [ ] 编辑状态下复制输入框文本（浏览器原生）

- [ ] **粘贴功能：**

  - [ ] Ctrl+V 粘贴到单个单元格
  - [ ] Ctrl+V 粘贴矩形数据
  - [ ] 菜单粘贴到单个单元格
  - [ ] 菜单粘贴矩形数据
  - [ ] 粘贴后自动扩展行列
  - [ ] 粘贴后选区更新

- [ ] **撤销/重做：**

  - [ ] 复制粘贴后可以撤销
  - [ ] 撤销后可以重做

- [ ] **跨平台测试：**

  - [ ] Windows (Ctrl 键)
  - [ ] macOS (Cmd 键)
  - [ ] Linux (Ctrl 键)

- [ ] **浏览器兼容性：**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
  - [ ] Safari

---

## ⚠️ 风险评估

### 高风险

1. **浏览器兼容性问题**

   - **风险：** Clipboard API 在旧浏览器中不可用
   - **缓解：** 实现 `document.execCommand` 降级方案
   - **测试：** 在多个浏览器版本中测试

2. **权限问题**
   - **风险：** 某些浏览器需要用户授权才能访问剪贴板
   - **缓解：** 提供友好的错误提示，引导用户授权
   - **测试：** 在隐私模式下测试

### 中风险

3. **性能问题**

   - **风险：** 复制粘贴大量数据时可能卡顿
   - **缓解：** 对大数据量进行性能优化（如：分块处理）
   - **测试：** 测试复制粘贴 10,000+ 单元格

4. **数据格式问题**
   - **风险：** 粘贴来自 Excel 的数据可能包含特殊字符
   - **缓解：** 增强解析逻辑，处理多种换行符和分隔符
   - **测试：** 测试从 Excel、Google Sheets 等粘贴数据

### 低风险

5. **状态同步问题**
   - **风险：** 粘贴后数据同步可能不及时
   - **缓解：** 确保在粘贴后调用 `notifyDataChange`
   - **测试：** 测试粘贴后父组件能否立即获取最新数据

---

## 📅 时间线

### 第一周：核心重构

- **Day 1-2:** 重构 `useClipboard` 核心逻辑

  - 实现 `ClipboardOperations` 接口
  - 实现 `CopyStrategyManager`
  - 实现 `PasteStrategyManager`

- **Day 3-4:** 增强 `useKeyboard`

  - 添加 Ctrl+C / Ctrl+V 快捷键处理
  - 集成程序化复制粘贴

- **Day 5:** 修复 `useCellMenu`
  - 替换菜单触发的复制粘贴逻辑
  - 测试菜单操作

### 第二周：集成和测试

- **Day 6-7:** 更新 `Excel.vue`

  - 集成新的 `useClipboard`
  - 传递新的参数

- **Day 8-9:** 单元测试和集成测试

  - 编写 `useClipboard` 单元测试
  - 编写 Excel 组件集成测试

- **Day 10:** 手动测试和 Bug 修复
  - 多浏览器测试
  - 跨平台测试
  - 性能测试

---

## 📊 成功指标

### 功能指标

- ✅ 复制功能成功率 > 99%
- ✅ 粘贴功能成功率 > 99%
- ✅ 快捷键触发成功率 > 95%
- ✅ 菜单触发成功率 > 95%

### 性能指标

- ✅ 复制 1000 个单元格 < 100ms
- ✅ 粘贴 1000 个单元格 < 200ms
- ✅ 复制粘贴不阻塞 UI

### 质量指标

- ✅ 单元测试覆盖率 > 80%
- ✅ 集成测试覆盖率 > 60%
- ✅ 无已知的 P0/P1 Bug

---

## 📚 附录

### A. 相关文件清单

```
src/
├── Components/
│   ├── Common/
│   │   └── Excel.vue                          # 主组件（需修改）
│   └── Excel/
│       └── CellMenu.vue                        # 菜单组件（无需修改）
├── composables/
│   └── Excel/
│       ├── useClipboard.ts                     # 剪贴板逻辑（需重构）
│       ├── useKeyboard.ts                      # 键盘逻辑（需增强）
│       ├── useCellMenu.ts                      # 菜单逻辑（需修复）
│       ├── useExcelData.ts                     # 数据管理（无需修改）
│       └── types.ts                            # 类型定义（需扩展）
└── __tests__/
    └── Excel.copy-paste.spec.ts                # 测试文件（需新建）
```

### B. API 变更清单

#### useClipboard

**新增方法：**

```typescript
copyToClipboard(): Promise<boolean>
pasteFromClipboard(): Promise<boolean>
hasClipboardContent(): Promise<boolean>
```

**修改参数：**

```typescript
// 新增参数
multiSelections: Ref<SelectionRange[]>
notifyDataChange: () => void
```

#### useKeyboard

**修改参数：**

```typescript
// 新增参数
copyToClipboard?: () => Promise<boolean>
pasteFromClipboard?: () => Promise<boolean>
```

#### useCellMenu

**修改参数：**

```typescript
// 替换参数
// 旧：handleCopy: (event: ClipboardEvent) => void
// 新：copyToClipboard: () => Promise<boolean>

// 旧：handlePaste: (event: ClipboardEvent) => void
// 新：pasteFromClipboard: () => Promise<boolean>
```

### C. 兼容性说明

#### 浏览器支持

| 浏览器       | Clipboard API | execCommand (降级) |
| ------------ | ------------- | ------------------ |
| Chrome 66+   | ✅            | ✅                 |
| Firefox 63+  | ✅            | ✅                 |
| Edge 79+     | ✅            | ✅                 |
| Safari 13.1+ | ✅            | ✅                 |

#### 操作系统支持

| 操作系统 | 快捷键          | 支持情况 |
| -------- | --------------- | -------- |
| Windows  | Ctrl+C / Ctrl+V | ✅       |
| macOS    | Cmd+C / Cmd+V   | ✅       |
| Linux    | Ctrl+C / Ctrl+V | ✅       |

---

## 🎯 总结

本重构方案通过以下措施解决复制粘贴功能不生效的问题：

1. **统一架构：** 将分散的逻辑整合到 `useClipboard`，提供统一的复制粘贴接口
2. **分离关注点：** 策略模式分离复制/粘贴逻辑，降低耦合度
3. **增强功能：** 支持多选、编辑模式、程序化调用等多种场景
4. **改善体验：** 提供快捷键、菜单、原生事件三种触发方式
5. **提高质量：** 完善错误处理、测试覆盖、浏览器兼容性

预期重构后，复制粘贴功能将更加健壮、易用、可维护。

---

**文档版本：** v1.0  
**创建日期：** 2026-01-09  
**最后更新：** 2026-01-09  
**作者：** AI Assistant (Claude Sonnet 4.5)
