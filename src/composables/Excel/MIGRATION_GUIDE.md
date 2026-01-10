# Excel 状态管理迁移指南

## 📋 概述

本文档说明如何从旧的分散状态管理迁移到新的统一状态管理架构。

## 🎯 迁移目标

- ✅ 统一管理核心状态（数据、选择、编辑）
- ✅ 减少参数传递
- ✅ 提高代码可维护性
- ✅ 保持向后兼容

## 📦 新架构组件

### 1. useExcelState - 统一状态管理

创建统一的状态管理模块：

```typescript
import { useExcelState } from './composables/Excel/useExcelState';

const excelState = useExcelState({
  initialData: props.modelValue,
});

// 访问状态
excelState.data.tableData.value
excelState.selection.activeCell.value
excelState.editing.editingCell.value
```

### 2. 重构后的 Composables

所有核心 composables 现在支持统一状态：

#### useSelection

```typescript
// 新方式（推荐）
const selection = useSelection({ state: excelState.selection });

// 旧方式（向后兼容）
const selection = useSelection();
```

#### useCellEditing

```typescript
// 新方式（推荐）
const editing = useCellEditing({
  dataState: excelState.data,
  editingState: excelState.editing,
  // ... 其他选项
});

// 旧方式（向后兼容）
const editing = useCellEditing({
  tableData: ref([[]]),
  // ... 其他选项
});
```

#### useClipboard

```typescript
// 新方式（推荐）
const clipboard = useClipboard({
  state: excelState,
  saveHistory,
  startSingleSelection,
  updateSingleSelectionEnd,
  notifyDataChange,
});

// 旧方式（向后兼容）
const clipboard = useClipboard({
  editingCell,
  normalizedSelection,
  tableData,
  // ... 其他参数
});
```

## 🔄 迁移步骤

### 步骤 1: 创建统一状态

```typescript
const excelState = useExcelState({
  initialData: props.modelValue,
});
```

### 步骤 2: 更新 Composables 使用统一状态

```typescript
// 选择管理
const selection = useSelection({ state: excelState.selection });

// 编辑管理
const editing = useCellEditing({
  dataState: excelState.data,
  editingState: excelState.editing,
  // ... 其他选项
});

// 剪贴板管理
const clipboard = useClipboard({
  state: excelState,
  // ... 其他选项
});
```

### 步骤 3: 从统一状态获取数据引用

```typescript
const { tableData, columns, rows } = excelState.data;
const { activeCell, normalizedSelection } = excelState.selection;
const { editingCell } = excelState.editing;
```

## ⚠️ 注意事项

### 数据同步

当前实现中，`useExcelData` 仍然创建自己的状态。在 `Excel.vue` 中，我们通过包装函数确保数据同步：

```typescript
const setData = (data: string[][]): void => {
  // 同步到统一状态
  excelState.data.tableData.value = data;
  // ... 更新列和行
  setDataOriginal(data);
};
```

### 向后兼容

所有 composables 都保持向后兼容：
- 如果提供了统一状态，使用统一状态
- 如果没有提供，创建独立状态（旧行为）

### 未来改进

1. **重构 useExcelData**：让 `useExcelData` 接受可选状态参数
2. **完全移除重复状态**：不再需要包装函数
3. **统一所有 composables**：所有 composables 都使用统一状态

## 📊 状态结构

```typescript
interface ExcelState {
  data: {
    tableData: Ref<string[][]>;
    columns: Ref<string[]>;
    rows: Ref<number[]>;
  };
  selection: {
    activeCell: Ref<CellPosition | null>;
    selectionStart: Ref<CellPosition | null>;
    selectionEnd: Ref<CellPosition | null>;
    isSelecting: Ref<boolean>;
    multiSelections: Ref<SelectionRange[]>;
    isMultipleMode: Ref<boolean>;
    normalizedSelection: ComputedRef<SelectionRange | null>;
  };
  editing: {
    editingCell: Ref<CellPosition | null>;
  };
  ui: {
    columnWidths: Ref<Map<number, number>>;
    rowHeights: Ref<Map<number, number>>;
  };
}
```

## ✅ 迁移检查清单

- [ ] 创建 `useExcelState` 实例
- [ ] 更新 `useSelection` 使用统一状态
- [ ] 更新 `useCellEditing` 使用统一状态
- [ ] 更新 `useClipboard` 使用统一状态
- [ ] 从统一状态获取数据引用
- [ ] 确保数据同步正常工作
- [ ] 测试所有功能
- [ ] 更新相关文档

## 🐛 常见问题

### Q: 数据不同步怎么办？

A: 确保所有数据操作都通过统一状态进行。如果使用 `useExcelData` 的方法，需要手动同步到统一状态。

### Q: 如何调试状态问题？

A: 使用 Vue DevTools 查看统一状态的变化。所有状态都在 `excelState` 对象中。

### Q: 旧代码还能用吗？

A: 是的，所有 composables 都保持向后兼容。可以逐步迁移。

## 📚 相关文档

- [状态管理分析报告](./STATE_MANAGEMENT_ANALYSIS.md)
- [useExcelState API 文档](./useExcelState.ts)

