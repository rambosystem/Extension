# Excel 组件文档

## 📋 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [文件结构](#文件结构)
- [Composables API](#composables-api)
- [使用方法](#使用方法)
- [功能特性](#功能特性)
- [键盘快捷键](#键盘快捷键)
- [开发指南](#开发指南)
- [最佳实践](#最佳实践)

## 概述

Excel 组件是一个功能完整的类 Excel 表格组件，支持单元格编辑、选择、复制粘贴、撤销重做、智能填充、列宽调整等功能。组件采用 Vue 3 Composition API 开发，通过 Composables 实现模块化设计，保证代码的可维护性和可复用性。

### 设计原则

- **自包含**: 通用组件不依赖 Store，每个实例拥有独立状态
- **模块化**: 功能拆分为独立的 Composables，职责清晰
- **可复用**: 可在任何 Vue 3 项目中使用
- **类型安全**: 完整的 JSDoc 类型注释

## 架构设计

### 组件架构图

```
Excel.vue (组件)
├── useExcelData (数据管理)
│   ├── tableData (表格数据)
│   ├── columns (列标题)
│   ├── rows (行索引)
│   └── 剪贴板处理
├── useSelection (选择逻辑)
│   ├── activeCell (活动单元格)
│   ├── selectionStart/End (选区)
│   └── 选择相关方法
├── useHistory (历史记录)
│   ├── historyStack (历史栈)
│   └── undo/redo 功能
├── useKeyboard (键盘处理)
│   ├── 导航键处理
│   ├── 撤销/重做
│   └── 直接输入
├── useColumnWidth (列宽管理)
│   ├── columnWidths (列宽状态)
│   ├── 拖拽调整
│   └── 自适应列宽
├── useRowHeight (行高管理)
│   ├── rowHeights (行高状态)
│   ├── 拖拽调整
│   └── 自适应行高
└── useFillHandle (智能填充)
    ├── 填充手柄显示
    ├── 拖拽填充
    └── 智能值计算
```

### 数据流向

```
用户操作 → Excel.vue → Composables → 状态更新 → UI 响应
```

## 文件结构

```
src/composables/Excel/
├── README.md              # 本文档
├── constants.js           # 常量定义
├── useExcelData.js       # 数据管理
├── useSelection.js       # 选择逻辑
├── useHistory.js         # 历史记录
├── useKeyboard.js        # 键盘处理
├── useColumnWidth.js     # 列宽管理
├── useRowHeight.js       # 行高管理
├── useFillHandle.js      # 智能填充
└── useExcelExport.js     # Excel 导出（独立功能）

src/Components/Common/
└── Excel.vue             # Excel 组件
```

## Composables API

### useExcelData

数据管理 Composable，负责表格数据的创建、管理和剪贴板操作。

#### 参数

```javascript
useExcelData(rowsCount?, colsCount?)
```

- `rowsCount` (number, 可选): 行数，默认 15
- `colsCount` (number, 可选): 列数，默认 10

#### 返回值

```typescript
{
  columns: Ref<string[]>,           // 列标题数组 (A, B, C, ...)
  rows: Ref<number[]>,              // 行索引数组 (0, 1, 2, ...)
  tableData: Ref<string[][]>,       // 表格数据二维数组
  getSmartValue: (value: string, step: number) => string,  // 智能填充
  generateClipboardText: (range: Range, data: string[][]) => string,  // 生成剪贴板文本
  parsePasteData: (text: string) => string[][]  // 解析粘贴数据
}
```

#### 示例

```javascript
const {
  columns,
  rows,
  tableData,
  getSmartValue,
  generateClipboardText,
  parsePasteData,
} = useExcelData(20, 15); // 20 行 15 列
```

### useSelection

选择逻辑 Composable，管理单元格选择和导航。

#### 返回值

```typescript
{
  activeCell: Ref<{ row: number, col: number } | null>,  // 活动单元格
  selectionStart: Ref<{ row: number, col: number } | null>,  // 选区起点
  selectionEnd: Ref<{ row: number, col: number } | null>,  // 选区终点
  isSelecting: Ref<boolean>,  // 是否正在选择
  normalizedSelection: ComputedRef<Range | null>,  // 归一化选区
  setSelection: (row: number, col: number) => void,  // 设置选择
  updateSelectionEnd: (row: number, col: number) => void,  // 更新选区终点
  isActive: (row: number, col: number) => boolean,  // 是否为活动单元格
  isInSelection: (row: number, col: number) => boolean,  // 是否在选区内
  isInSelectionHeader: (index: number, type: 'row' | 'col') => boolean,  // 是否在选区表头
  moveActiveCell: (rOffset: number, cOffset: number, maxRows: number, maxCols: number, extendSelection?: boolean) => void  // 移动活动单元格
}
```

#### 类型定义

```typescript
type Range = {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
};
```

### useHistory

历史记录 Composable，提供撤销/重做功能。

#### 参数

```javascript
useHistory(maxHistorySize?)
```

- `maxHistorySize` (number, 可选): 最大历史记录数，默认 50

#### 返回值

```typescript
{
  initHistory: (data: any) => void,  // 初始化历史记录
  saveHistory: (currentState: any) => void,  // 保存历史记录
  undo: () => any | null,  // 撤销，返回历史状态
  redo: () => any | null,  // 重做，返回历史状态
  canUndo: () => boolean,  // 是否可以撤销
  canRedo: () => boolean   // 是否可以重做
}
```

#### 使用示例

```javascript
const { initHistory, saveHistory, undo, redo } = useHistory(100);

// 初始化
onMounted(() => {
  initHistory(tableData.value);
});

// 保存历史
saveHistory(tableData.value);

// 撤销
const previousState = undo();
if (previousState) {
  tableData.value = previousState;
}
```

### useKeyboard

键盘处理 Composable，处理所有键盘事件。

#### 参数

```javascript
useKeyboard(context);
```

#### Context 对象

```typescript
{
  activeCell: Ref<{ row: number, col: number } | null>,
  editingCell: Ref<{ row: number, col: number } | null>,
  normalizedSelection: ComputedRef<Range | null>,
  moveActiveCell: Function,
  saveHistory: Function,
  undoHistory: Function,
  redoHistory: Function,
  startEdit: Function,
  deleteSelection: Function,
  tableData: Ref<string[][]>,
  getMaxRows: () => number,
  getMaxCols: () => number
}
```

#### 返回值

```typescript
{
  handleKeydown: (event: KeyboardEvent) => void  // 键盘事件处理函数
}
```

### useColumnWidth

列宽管理 Composable，负责管理 Excel 组件的列宽功能。

#### 参数

```javascript
useColumnWidth({
  defaultWidth?: number,  // 默认列宽，默认 100
  minWidth?: number,     // 最小列宽，默认 50
  maxWidth?: number,     // 最大列宽，默认 500
  colsCount?: number     // 列数，默认 10
})
```

#### 返回值

```typescript
{
  columnWidths: Ref<Map<number, number>>,  // 列宽映射表
  isResizingColumn: Ref<boolean>,          // 是否正在调整列宽
  resizingColumnIndex: Ref<number | null>, // 正在调整的列索引
  getColumnWidth: (colIndex: number) => number,  // 获取列宽
  startColumnResize: (colIndex: number, event: MouseEvent) => void,  // 开始调整列宽
  handleColumnResize: (event: MouseEvent) => void,  // 处理列宽调整
  stopColumnResize: () => void,  // 停止调整列宽
  handleDoubleClickResize: (colIndex: number, columns: string[], tableData: string[][], rowsCount: number) => void,  // 双击自适应列宽
  autoFitColumn: (colIndex: number, columns: string[], tableData: string[][], rowsCount: number) => void  // 自适应列宽
}
```

#### 使用示例

```javascript
const {
  getColumnWidth,
  startColumnResize,
  handleColumnResize,
  stopColumnResize,
  handleDoubleClickResize,
  isResizingColumn,
} = useColumnWidth({
  colsCount: columns.value.length,
});

// 在模板中使用
// :style="{ width: getColumnWidth(index) + 'px' }"
// @mousedown.stop="startColumnResize(index, $event)"
// @dblclick.stop="handleDoubleClickResize(index)"
```

### useFillHandle

智能填充管理 Composable，负责管理 Excel 组件的智能填充功能。

#### 参数

```javascript
useFillHandle({
  getSmartValue: Function, // 智能值计算函数
  saveHistory: Function, // 保存历史记录函数
});
```

#### 返回值

```typescript
{
  isDraggingFill: Ref<boolean>,  // 是否正在拖拽填充
  dragStartCell: Ref<{ row: number, col: number } | null>,  // 拖拽起始单元格
  dragEndCell: Ref<{ row: number, col: number } | null>,  // 拖拽结束单元格
  shouldShowHandle: (row: number, col: number, normalizedSelection: Range | null) => boolean,  // 是否显示填充手柄
  startFillDrag: (row: number, col: number, normalizedSelection: Range | null, onMouseUp: Function) => void,  // 开始填充拖拽
  handleFillDragEnter: (row: number, col: number) => void,  // 处理填充拖拽进入
  isInDragArea: (row: number, col: number) => boolean,  // 是否在拖拽填充区域内
  applyFill: (tableData: string[][], maxRows: number, maxCols: number) => void,  // 应用填充操作
  cleanup: () => void  // 清理填充状态
}
```

#### 使用示例

```javascript
const {
  shouldShowHandle,
  startFillDrag,
  handleFillDragEnter,
  isInDragArea,
  applyFill,
  isDraggingFill,
} = useFillHandle({
  getSmartValue,
  saveHistory,
});

// 在模板中使用
// v-if="shouldShowHandle(rowIndex, colIndex) && !editingCell"
// @mousedown.stop="startFillDrag(rowIndex, colIndex)"
```

## 使用方法

### 基础使用

```vue
<template>
  <Excel />
</template>

<script setup>
import Excel from "@/Components/Common/Excel.vue";
</script>
```

### Props 配置

Excel 组件支持以下 props：

| Prop                 | 类型      | 默认值 | 说明                                         |
| -------------------- | --------- | ------ | -------------------------------------------- |
| `enableColumnResize` | `boolean` | `true` | 是否启用列宽调整功能（拖拽调整和双击自适应） |
| `enableRowResize`    | `boolean` | `true` | 是否启用行高调整功能（拖拽调整和双击自适应） |
| `enableFillHandle`   | `boolean` | `true` | 是否启用智能填充功能（填充手柄和拖拽填充）   |
| `defaultColumnWidth` | `number`  | `100`  | 禁用列宽调整时的固定列宽（像素）             |
| `defaultRowHeight`   | `number`  | `28`   | 禁用行高调整时的固定行高（像素）             |

#### 使用示例

```vue
<template>
  <!-- 启用所有功能（默认） -->
  <Excel />

  <!-- 禁用列宽调整（使用默认100px） -->
  <Excel :enable-column-resize="false" />

  <!-- 禁用列宽调整（自定义120px） -->
  <Excel :enable-column-resize="false" :default-column-width="120" />

  <!-- 禁用行高调整（使用默认28px） -->
  <Excel :enable-row-resize="false" />

  <!-- 禁用行高调整（自定义40px） -->
  <Excel :enable-row-resize="false" :default-row-height="40" />

  <!-- 禁用智能填充 -->
  <Excel :enable-fill-handle="false" />

  <!-- 禁用所有扩展功能 -->
  <Excel
    :enable-column-resize="false"
    :enable-row-resize="false"
    :enable-fill-handle="false"
  />
</template>

<script setup>
import Excel from "@/Components/Common/Excel.vue";
</script>
```

### 自定义配置

组件内部使用默认配置（15 行 10 列），如需自定义，可以修改 `constants.js` 中的 `DEFAULT_CONFIG`：

```javascript
// src/composables/Excel/constants.js
export const DEFAULT_CONFIG = {
  ROWS_COUNT: 20, // 自定义行数
  COLS_COUNT: 15, // 自定义列数
  MAX_HISTORY_SIZE: 100, // 自定义历史记录数
};
```

### 访问组件数据

如果需要访问组件内部数据，可以通过 ref：

```vue
<template>
  <Excel ref="excelRef" />
  <button @click="exportData">导出数据</button>
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

const excelRef = ref(null);

const exportData = () => {
  // 注意：由于组件未暴露数据，需要通过其他方式访问
  // 建议通过事件或 props 传递数据
};
</script>
```

## 功能特性

### ✅ 已实现功能

- [x] **单元格编辑**: 双击或选中后直接输入编辑
- [x] **单元格选择**: 鼠标点击、拖拽选择
- [x] **键盘导航**: 方向键、Tab、Enter 导航
- [x] **复制粘贴**: 支持多单元格复制粘贴
- [x] **撤销重做**: Ctrl+Z / Ctrl+Y
- [x] **智能填充**: 拖拽填充手柄自动递增（可选）
- [x] **删除内容**: Delete / Backspace 删除选中内容
- [x] **历史记录**: 自动保存操作历史
- [x] **列宽调整**: 拖拽列边界调整列宽（可选）
- [x] **自适应列宽**: 双击列边界自动适应内容宽度（可选）
- [x] **行高调整**: 拖拽行边界调整行高（可选）
- [x] **自适应行高**: 双击行边界自动适应内容高度（可选）

### 🔄 智能填充算法

智能填充支持以下模式：

1. **纯数字**: `1` → `2` → `3` ...
2. **末尾数字**: `Item1` → `Item2` → `Item3` ...
3. **其他**: 保持原值不变

### 📋 剪贴板格式

- **行分隔符**: `\n` (换行符)
- **列分隔符**: `\t` (制表符)
- **兼容性**: 兼容 Excel、Google Sheets 等

### 📏 列宽管理

组件支持灵活的列宽管理功能：

1. **拖拽调整**: 将鼠标悬停在列边界（header 单元格右边界），出现 resizer 后拖拽调整列宽

   - 最小列宽: 50px
   - 最大列宽: 500px
   - 默认列宽: 100px

2. **双击自适应**: 双击列边界（resizer），自动根据该列的内容宽度调整列宽

   - 会检查 header 文本宽度
   - 会检查该列所有单元格的内容宽度
   - 自动计算合适的列宽（包含边距）

3. **手动触发**: 可以通过 `autoFitColumn` 方法手动触发自适应

### 📐 行高管理

组件支持灵活的行高管理功能：

1. **拖拽调整**: 将鼠标悬停在行边界（行号单元格下边界），出现 resizer 后拖拽调整行高

   - 最小行高: 20px
   - 最大行高: 200px
   - 默认行高: 28px

2. **双击自适应**: 双击行边界（resizer），自动根据该行的内容高度调整行高

   - 会检查该行所有单元格的内容高度
   - 自动计算合适的行高（包含边距）

3. **手动触发**: 可以通过 `autoFitRow` 方法手动触发自适应

## 键盘快捷键

### 导航键

| 快捷键                  | 功能           |
| ----------------------- | -------------- |
| `↑` `↓` `←` `→`         | 移动活动单元格 |
| `Shift + ↑` `↓` `←` `→` | 扩展选择范围   |
| `Tab`                   | 向右移动       |
| `Shift + Tab`           | 向左移动       |
| `Enter`                 | 向下移动       |
| `Shift + Enter`         | 向上移动       |

### 编辑键

| 快捷键                 | 功能               |
| ---------------------- | ------------------ |
| `双击单元格`           | 开始编辑           |
| `Esc`                  | 取消编辑           |
| `Enter` (编辑中)       | 完成编辑并向下移动 |
| `Tab` (编辑中)         | 完成编辑并向右移动 |
| `Delete` / `Backspace` | 删除选中内容       |

### 操作键

| 快捷键                                 | 功能        |
| -------------------------------------- | ----------- |
| `Ctrl + Z` / `Cmd + Z`                 | 撤销        |
| `Ctrl + Y` / `Cmd + Y`                 | 重做        |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | 重做（Mac） |
| `Ctrl + C` / `Cmd + C`                 | 复制        |
| `Ctrl + V` / `Cmd + V`                 | 粘贴        |

### 直接输入

- 选中单元格后直接输入字符，会自动开始编辑并替换内容

### 列宽操作

| 操作         | 功能         |
| ------------ | ------------ |
| `拖拽列边界` | 手动调整列宽 |
| `双击列边界` | 自动适应列宽 |

### 行高操作

| 操作         | 功能         |
| ------------ | ------------ |
| `拖拽行边界` | 手动调整行高 |
| `双击行边界` | 自动适应行高 |

## 开发指南

### 添加新功能

1. **创建新的 Composable** (如需要)

   ```javascript
   // src/composables/Excel/useNewFeature.js
   export function useNewFeature() {
     // 实现逻辑
     return {
       /* ... */
     };
   }
   ```

2. **在 Excel.vue 中使用**

   ```vue
   <script setup>
   import { useNewFeature } from "../../composables/Excel/useNewFeature";

   const {
     /* ... */
   } = useNewFeature();
   </script>
   ```

3. **更新常量** (如需要)
   ```javascript
   // src/composables/Excel/constants.js
   export const NEW_CONSTANT = "value";
   ```

### 修改样式

组件样式在 `Excel.vue` 的 `<style>` 部分，使用 SCSS 变量：

```scss
$border-color: #d0d7e5;
$primary-color: #4a90e2;
$selection-bg: rgba(74, 144, 226, 0.15);
$header-bg: #f8f9fa;
$header-active-bg: #e2e6ea;
```

### 调试技巧

1. **查看组件状态**: 在浏览器控制台检查 Vue DevTools
2. **检查历史记录**: 历史记录存储在 `useHistory` 的 `historyStack` 中
3. **验证选区**: 使用 `normalizedSelection` 计算属性

## 最佳实践

### ✅ 推荐做法

1. **使用常量**: 不要硬编码魔法数字和字符串

   ```javascript
   // ✅ 好
   import { DEFAULT_CONFIG } from "./constants.js";
   const rows = DEFAULT_CONFIG.ROWS_COUNT;

   // ❌ 不好
   const rows = 15;
   ```

2. **错误处理**: 始终添加边界检查和错误处理

   ```javascript
   // ✅ 好
   if (row >= 0 && row < rows.value.length) {
     // 操作
   }

   // ❌ 不好
   tableData.value[row][col] = value;
   ```

3. **类型注释**: 为函数添加 JSDoc 注释

   ```javascript
   /**
    * 处理单元格点击
    * @param {number} row - 行索引
    * @param {number} col - 列索引
    */
   const handleClick = (row, col) => {
     // ...
   };
   ```

4. **资源清理**: 在 `onUnmounted` 中清理事件监听器
   ```javascript
   onUnmounted(() => {
     window.removeEventListener("mouseup", handleMouseUp);
     cellInputRefs.clear();
   });
   ```

### ❌ 避免的做法

1. **不要直接修改响应式数据**: 使用提供的方法
2. **不要跳过边界检查**: 始终验证数组索引
3. **不要忘记清理**: 及时清理事件监听器和引用
4. **不要硬编码**: 使用常量文件管理配置

## 性能优化

### 已实现的优化

1. **计算属性缓存**: `normalizedSelection` 使用 `computed`
2. **历史记录限制**: 默认最多保存 50 条历史记录
3. **事件防抖**: 键盘事件处理已优化
4. **DOM 引用管理**: 使用 Map 管理输入框引用

### 性能建议

1. **大数据量**: 如果表格很大（>1000 单元格），考虑虚拟滚动
2. **历史记录**: 根据需求调整 `MAX_HISTORY_SIZE`
3. **深拷贝**: 当前使用 JSON 序列化，大数据量时考虑其他方案

## 常见问题

### Q: 如何自定义表格大小？

A: 修改 `constants.js` 中的 `DEFAULT_CONFIG`，或直接修改 `useExcelData` 的调用：

```javascript
const { tableData } = useExcelData(20, 15); // 20 行 15 列
```

### Q: 如何获取表格数据？

A: 组件内部数据未暴露，建议通过以下方式：

- 添加 `@change` 事件在数据变化时通知父组件
- 使用 `ref` 访问组件实例（需要组件暴露数据）

### Q: 如何支持更多列（超过 26 列）？

A: 修改 `useExcelData.js` 中的列标题生成逻辑：

```javascript
// 当前: A-Z (26 列)
const columns = ref(
  Array.from({ length: colsCount }, (_, i) => String.fromCharCode(65 + i))
);

// 支持更多列: A, B, ..., Z, AA, AB, ...
```

### Q: 历史记录占用内存过大怎么办？

A: 减少 `MAX_HISTORY_SIZE` 或使用更高效的深拷贝方案。

### Q: 如何自定义列宽范围？

A: 在使用 `useColumnWidth` 时传入自定义参数：

```javascript
const { getColumnWidth } = useColumnWidth({
  defaultWidth: 120, // 自定义默认列宽
  minWidth: 60, // 自定义最小列宽
  maxWidth: 600, // 自定义最大列宽
  colsCount: columns.value.length,
});
```

### Q: 列宽会自动适应内容吗？

A: 不会自动适应。组件采用手动触发的方式：

- **双击列边界**: 自动适应该列的内容宽度
- **拖拽调整**: 手动调整到任意宽度

这样设计可以避免频繁的自动调整影响用户体验，同时保留了按需自适应的功能。

### Q: 如何禁用列宽调整功能？

A: 通过 `enableColumnResize` prop 控制：

```vue
<template>
  <!-- 禁用列宽调整（使用默认100px） -->
  <Excel :enable-column-resize="false" />

  <!-- 禁用列宽调整（自定义固定宽度） -->
  <Excel :enable-column-resize="false" :default-column-width="120" />
</template>
```

禁用后，列宽将使用固定宽度（默认 100px，可通过 `defaultColumnWidth` prop 自定义），不会显示 resizer，也无法进行拖拽或双击自适应操作。

### Q: 如何禁用行高调整功能？

A: 通过 `enableRowResize` prop 控制：

```vue
<template>
  <!-- 禁用行高调整（使用默认28px） -->
  <Excel :enable-row-resize="false" />

  <!-- 禁用行高调整（自定义固定高度） -->
  <Excel :enable-row-resize="false" :default-row-height="40" />
</template>
```

禁用后，行高将使用固定高度（默认 28px，可通过 `defaultRowHeight` prop 自定义），不会显示 resizer，也无法进行拖拽或双击自适应操作。

### Q: 如何禁用智能填充功能？

A: 通过 `enableFillHandle` prop 控制：

```vue
<template>
  <!-- 禁用智能填充 -->
  <Excel :enable-fill-handle="false" />
</template>
```

禁用后，不会显示填充手柄，也无法进行拖拽填充操作。

## 更新日志

### v1.2.0 (当前版本)

- ✅ 新增智能填充管理功能 (`useFillHandle`)
- ✅ 组件化重构，提取智能填充逻辑
- ✅ 添加 `enableFillHandle` prop，支持可选启用/禁用智能填充功能（默认启用）

### v1.1.0

- ✅ 新增列宽管理功能 (`useColumnWidth`)
- ✅ 支持拖拽调整列宽
- ✅ 支持双击列边界自适应列宽
- ✅ 组件化重构，提取列宽管理逻辑
- ✅ 添加 `enableColumnResize` prop，支持可选启用/禁用列宽功能（默认启用）

### v1.0.0

- ✅ 基础功能实现
- ✅ 模块化重构
- ✅ 代码质量提升
- ✅ 完整的类型注释
- ✅ 错误处理优化

## 贡献指南

1. 遵循现有代码风格
2. 添加 JSDoc 注释
3. 更新相关文档
4. 确保无 linter 错误
