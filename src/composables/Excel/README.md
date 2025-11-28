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

Excel 组件是一个功能完整的类 Excel 表格组件，支持单元格编辑、选择、复制粘贴、撤销重做、智能填充、列宽/行高调整、数据管理（v-model 双向绑定）等功能。组件采用 Vue 3 Composition API 开发，通过 Composables 实现模块化设计，保证代码的可维护性和可复用性。

### 核心特性

- **动态行列支持**: 组件会根据实际数据自动调整行列数，无需手动配置
- **自动扩展**: 编辑单元格或粘贴数据时，如果超出当前范围会自动扩展行列
- **列标题生成**: 支持超过 26 列（A-Z, AA-AZ, BA-BZ...）
- **智能数据管理**: 通过 v-model 双向绑定，数据变化自动同步

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

**重要**: 组件支持动态行列，会根据 `initialData` 自动计算实际需要的行列数。如果提供了 `initialData`，行列数会根据数据自动调整；如果没有提供，则使用默认值。

#### 参数

```javascript
useExcelData({
  rowsCount?: number,      // 行数，默认 15（仅在无 initialData 时使用）
  colsCount?: number,      // 列数，默认 10（仅在无 initialData 时使用）
  initialData?: string[][] // 初始数据，可选（如果提供，行列数会根据数据自动计算）
})
```

#### 动态行列说明

- 如果提供了 `initialData`，组件会：
  - 自动计算实际行数（数据数组的长度）
  - 自动计算实际列数（数据中最长行的长度）
  - 自动生成列标题（A, B, C, ..., Z, AA, AB, ...）
- 如果未提供 `initialData`，使用 `rowsCount` 和 `colsCount` 作为默认值
- 在运行时，通过 `setData()` 或 `updateCell()` 可以动态扩展行列

#### 返回值

```typescript
{
  columns: Ref<string[]>,           // 列标题数组 (A, B, C, ...)
  rows: Ref<number[]>,              // 行索引数组 (0, 1, 2, ...)
  tableData: Ref<string[][]>,       // 表格数据二维数组
  getSmartValue: (value: string, step: number) => string,  // 智能填充
  generateClipboardText: (range: Range, data: string[][]) => string,  // 生成剪贴板文本
  parsePasteData: (text: string) => string[][]  // 解析粘贴数据
  setData: (data: string[][]) => void,  // 设置表格数据
  getData: () => string[][],  // 获取表格数据（深拷贝）
  updateCell: (row: number, col: number, value: string) => void,  // 更新单个单元格
  clearData: () => void  // 清空表格数据
}
```

#### 示例

```javascript
// 使用默认配置
const {
  columns,
  rows,
  tableData,
  getSmartValue,
  generateClipboardText,
  parsePasteData,
} = useExcelData();

// 自定义行数和列数
const { tableData } = useExcelData({
  rowsCount: 20,
  colsCount: 15,
});

// 使用初始数据（行列数会自动计算：3行3列）
const { tableData, columns, rows } = useExcelData({
  initialData: [
    ["姓名", "年龄", "城市"],
    ["张三", "25", "北京"],
    ["李四", "30", "上海"],
  ],
});
// columns: ["A", "B", "C"]
// rows: [0, 1, 2]
// tableData: [["姓名", "年龄", "城市"], ["张三", "25", "北京"], ["李四", "30", "上海"]]

// 动态扩展示例
const { setData, updateCell } = useExcelData({
  initialData: [["A1", "B1"]], // 初始 1行2列
});

// 通过 setData 扩展（会自动调整为 3行4列）
setData([
  ["A1", "B1", "C1", "D1"],
  ["A2", "B2", "C2", "D2"],
  ["A3", "B3", "C3", "D3"],
]);

// 通过 updateCell 扩展（超出范围时自动扩展）
updateCell(5, 6, "G6"); // 自动扩展为 6行7列
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

### 数据管理

#### 1. v-model 双向绑定

```vue
<template>
  <Excel v-model="excelData" />
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

const excelData = ref([
  ["姓名", "年龄", "城市"],
  ["张三", "25", "北京"],
  ["李四", "30", "上海"],
]);
</script>
```

#### 2. 初始数据 + 监听变化

```vue
<template>
  <Excel :model-value="initialData" @change="handleDataChange" />
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

const initialData = ref([
  ["产品", "价格", "库存"],
  ["商品A", "100", "50"],
]);

const handleDataChange = (data) => {
  console.log("数据变化:", data);
};
</script>
```

#### 3. 动态行列示例

组件会根据数据自动调整行列数，无需手动配置：

```vue
<template>
  <Excel v-model="excelData" />
  <button @click="addRow">添加行</button>
  <button @click="addColumn">添加列</button>
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

// 初始数据：2行3列，组件会自动识别
const excelData = ref([
  ["A1", "B1", "C1"],
  ["A2", "B2", "C2"],
]);

const addRow = () => {
  // 添加新行，组件会自动扩展
  excelData.value.push(["A3", "B3", "C3"]);
};

const addColumn = () => {
  // 为所有行添加新列，组件会自动扩展
  excelData.value.forEach((row) => {
    row.push("新列");
  });
  // 列标题会自动生成（D, E, F...）
};
</script>
```

**注意**:

- 数据变化时，组件会自动调整行列数
- 列标题会自动生成（A, B, C, ..., Z, AA, AB, ...）
- 粘贴超出范围的数据时，会自动扩展行列

#### 3. 通过方法操作数据

```vue
<template>
  <Excel ref="excelRef" />
  <button @click="updateData">更新数据</button>
  <button @click="getData">获取数据</button>
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

const excelRef = ref(null);

const updateData = () => {
  if (excelRef.value) {
    // 更新单个单元格
    excelRef.value.updateCell(0, 0, "新值");

    // 或设置整个表格数据
    excelRef.value.setData([
      ["列1", "列2", "列3"],
      ["数据1", "数据2", "数据3"],
    ]);
  }
};

const getData = () => {
  if (excelRef.value) {
    const data = excelRef.value.getData();
    console.log("当前数据:", data);
  }
};
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

组件内部使用默认配置（15 行 10 列），但**如果通过 v-model 或 initialData 传入数据，行列数会根据实际数据自动调整**。

如需修改默认值（仅在无初始数据时使用），可以修改 `constants.js` 中的 `DEFAULT_CONFIG`：

```javascript
// src/composables/Excel/constants.js
export const DEFAULT_CONFIG = {
  ROWS_COUNT: 20, // 默认行数（仅在无 initialData 时使用）
  COLS_COUNT: 15, // 默认列数（仅在无 initialData 时使用）
  MAX_HISTORY_SIZE: 100, // 自定义历史记录数
};
```

**注意**: 由于组件支持动态行列，实际使用的行列数会根据数据自动计算，`ROWS_COUNT` 和 `COLS_COUNT` 仅在没有提供初始数据时作为默认值使用。

### 访问组件数据

组件支持多种方式访问和操作数据：

#### 方式 1: v-model 双向绑定

```vue
<template>
  <Excel v-model="excelData" />
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

const excelData = ref([["数据"]]);
// excelData 会自动与组件内部数据同步
</script>
```

#### 方式 2: 通过 ref 调用方法

```vue
<template>
  <Excel ref="excelRef" />
  <button @click="getData">获取数据</button>
  <button @click="setData">设置数据</button>
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

const excelRef = ref(null);

const getData = () => {
  const data = excelRef.value?.getData();
  console.log("当前数据:", data);
};

const setData = () => {
  excelRef.value?.setData([["新", "数据"]]);
};
</script>
```

#### 方式 3: 监听 change 事件

```vue
<template>
  <Excel @change="handleDataChange" />
</template>

<script setup>
import Excel from "@/Components/Common/Excel.vue";

const handleDataChange = (data) => {
  console.log("数据变化:", data);
  // 处理数据变化
};
</script>
```

### 暴露的方法

通过 `ref` 可以调用以下方法：

| 方法                          | 参数                                      | 返回值            | 说明                         |
| ----------------------------- | ----------------------------------------- | ----------------- | ---------------------------- |
| `getData()`                   | -                                         | `string[][]`      | 获取表格数据的深拷贝         |
| `setData(data)`               | `data: string[][]`                        | `void`            | 设置整个表格数据             |
| `updateCell(row, col, value)` | `row: number, col: number, value: string` | `void`            | 更新单个单元格               |
| `clearData()`                 | -                                         | `void`            | 清空所有单元格数据           |
| `tableData`                   | -                                         | `Ref<string[][]>` | 表格数据的响应式引用（只读） |

## 功能特性

### ✅ 已实现功能

- [x] **单元格编辑**: 双击或选中后直接输入编辑
- [x] **单元格选择**: 鼠标点击、拖拽选择
- [x] **键盘导航**: 方向键、Tab、Enter 导航
- [x] **复制粘贴**: 支持多单元格复制粘贴，粘贴超出范围时自动扩展行列
- [x] **撤销重做**: Ctrl+Z / Ctrl+Y
- [x] **智能填充**: 拖拽填充手柄自动递增（可选）
- [x] **删除内容**: Delete / Backspace 删除选中内容
- [x] **历史记录**: 自动保存操作历史
- [x] **动态行列**: 根据实际数据自动调整行列数，支持运行时扩展
- [x] **列宽调整**: 拖拽列边界调整列宽（可选）
- [x] **自适应列宽**: 双击列边界自动适应内容宽度（可选）
- [x] **行高调整**: 拖拽行边界调整行高（可选）
- [x] **自适应行高**: 双击行边界自动适应内容高度（可选，与列宽联动）
- [x] **智能显示**: 根据列宽和行高智能判断是否换行
- [x] **数据管理**: 支持 v-model 双向绑定、初始数据、方法调用
- [x] **列标题生成**: 支持超过 26 列（A-Z, AA-AZ, BA-BZ...）

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
   - **智能计算**: 根据实际列宽计算换行后的行数，确保行高自适应与列宽自适应联动
   - 自动计算合适的行高（包含边距）

3. **手动触发**: 可以通过 `autoFitRow` 方法手动触发自适应

4. **固定元素**: 行号和列标题保持固定高度（28px），不受行高调整影响

### 🎨 智能显示策略

组件根据列宽和行高智能决定单元格内容的显示方式：

1. **单行显示**: 当列宽足够显示完整内容时，单行显示，垂直居中
2. **换行显示**: 当列宽不够但行高足够时，自动换行显示，垂直居中
3. **省略显示**: 当列宽和行高都不够时，单行显示并显示省略号，垂直居中

**特点**:

- 精确的宽度计算：区分全角字符（汉字/全角标点，约 13.5px）和半角字符（英文/数字，约 8.5px）
- 动态对齐：所有单元格内容默认垂直居中，无论单行还是多行
- 一致性：JS 计算参数与 CSS 渲染样式完全对齐（fontSize: 13px, lineHeight: 1.4）

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

### Q: 如何获取和设置表格数据？

A: 有多种方式可以管理表格数据：

1. **使用 v-model 双向绑定**（推荐）：

```vue
<template>
  <Excel v-model="excelData" />
</template>
<script setup>
const excelData = ref([["数据"]]);
// excelData 会自动与组件内部数据同步
</script>
```

2. **通过 ref 调用方法**：

```vue
<template>
  <Excel ref="excelRef" />
  <button @click="getData">获取数据</button>
  <button @click="setData">设置数据</button>
</template>
<script setup>
const excelRef = ref(null);

const getData = () => {
  const data = excelRef.value?.getData();
  console.log("当前数据:", data);
};

const setData = () => {
  excelRef.value?.setData([["新", "数据"]]);
};
</script>
```

3. **监听 change 事件**：

```vue
<template>
  <Excel @change="handleChange" />
</template>
<script setup>
const handleChange = (data) => {
  console.log("数据变化:", data);
};
</script>
```

4. **传入初始数据**：

```vue
<template>
  <Excel :model-value="initialData" />
</template>
<script setup>
const initialData = ref([
  ["姓名", "年龄"],
  ["张三", "25"],
]);
</script>
```

### Q: 如何支持更多列（超过 26 列）？

A: **组件已内置支持超过 26 列**！列标题会自动生成：A, B, C, ..., Z, AA, AB, AC, ..., AZ, BA, BB, ...

当数据列数超过 26 列时，组件会自动使用双字母列标题。例如：

- 第 1-26 列: A, B, C, ..., Z
- 第 27-52 列: AA, AB, AC, ..., AZ
- 第 53-78 列: BA, BB, BC, ..., BZ
- 以此类推...

无需任何额外配置，组件会根据实际数据自动生成正确的列标题。

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

### Q: 组件如何支持动态行列？

A: 组件内置支持动态行列，无需额外配置：

1. **自动计算**: 如果通过 `v-model` 或 `initialData` 传入数据，组件会自动计算实际需要的行列数
2. **自动扩展**: 编辑单元格或粘贴数据时，如果超出当前范围，会自动扩展行列
3. **列标题自动生成**: 列标题会根据实际列数自动生成（A-Z, AA-AZ, BA-BZ...）

示例：

```vue
<template>
  <!-- 数据会自动确定行列数 -->
  <Excel v-model="excelData" />
</template>

<script setup>
import { ref } from "vue";
import Excel from "@/Components/Common/Excel.vue";

// 3行4列的数据，组件会自动识别
const excelData = ref([
  ["A1", "B1", "C1", "D1"],
  ["A2", "B2", "C2", "D2"],
  ["A3", "B3", "C3", "D3"],
]);
</script>
```

### Q: 粘贴数据超出当前范围会怎样？

A: 组件会自动扩展行列以容纳粘贴的数据。例如：

- 如果当前是 3 行 3 列，粘贴 5 行 4 列的数据，会自动扩展为 5 行 4 列
- 列标题会自动生成（A, B, C, D）
- 行号会自动更新（1, 2, 3, 4, 5）

## 更新日志

### v1.6.0 (当前版本)

- ✅ **新增动态行列支持**
  - 组件会根据实际数据自动计算行列数，无需手动配置
  - 支持通过 `initialData` 或 `v-model` 传入数据，自动识别行列数
  - 编辑单元格或粘贴数据时，超出范围会自动扩展行列
  - 列标题自动生成，支持超过 26 列（A-Z, AA-AZ, BA-BZ...）
  - `setData()` 和 `updateCell()` 方法支持动态扩展
  - 粘贴功能支持自动扩展行列
- ✅ 优化数据管理
  - `useExcelData` 现在会根据 `initialData` 自动计算实际行列数
  - `rowsCount` 和 `colsCount` 仅在无初始数据时作为默认值使用

### v1.5.0

- ✅ 优化智能显示策略
  - 精确的宽度计算：区分全角字符（汉字）和半角字符（英文/数字）
  - 根据列宽和行高智能判断是否换行
  - 所有单元格内容默认垂直居中（单行和多行）
- ✅ 优化行高自适应
  - 行高自适应与列宽自适应联动
  - 根据实际列宽计算换行后的行数
- ✅ 优化对齐方式
  - 行号和列标题保持固定高度（28px）并垂直居中
  - 数据单元格内容垂直居中显示
- ✅ 修复行高自适应在列宽自适应后失效的问题

### v1.4.0

- ✅ 新增数据管理功能
- ✅ 支持 `v-model` 双向绑定
- ✅ 支持通过 `modelValue` prop 传入初始数据
- ✅ 支持 `@change` 事件监听数据变化
- ✅ 使用 `defineExpose` 暴露数据操作方法（`getData`, `setData`, `updateCell`, `clearData`）
- ✅ 修改 `useExcelData` 支持初始数据传入
- ✅ 数据变化自动同步到外部

### v1.3.0

- ✅ 新增行高管理功能 (`useRowHeight`)
- ✅ 支持拖拽调整行高
- ✅ 支持双击行边界自适应行高
- ✅ 组件化重构，提取行高管理逻辑
- ✅ 添加 `enableRowResize` prop，支持可选启用/禁用行高功能（默认启用）
- ✅ 添加 `defaultRowHeight` prop，支持自定义禁用时的固定行高（默认 28px）

### v1.2.0

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

## 后续计划

1. 渲染性能 (Rendering Performance)
   - 现状：文档提到大数据量建议使用虚拟滚动，但组件似乎默认是渲染所有 DOM。
   - 风险：当单元格数量超过 1000-2000 个（例如 50 行 x 40 列）时，Vue 的响应式系统加上大量的 DOM 节点（每个单元格可能有多个监听器和样式绑定）会导致显著的卡顿。
   - 建议：如果这是为了生产环境，**Virtual Scrolling (虚拟滚动)** 几乎是必选项。
2. 数据模型限制 (Data Model Limitations)
   - 现状：数据结构是 `string[][]`。
   - 风险：这限制了单元格只能存储文本。如果未来需要支持**单元格样式**（背景色、加粗）、**公式**（`=SUM(A1:B2)`）或**数据类型**（货币、日期），二维字符串数组将不再适用。
   - **建议**：考虑将数据模型扩展为对象数组结构，例如 `CellData[][]`，其中 `CellData = { value: string, style?: Object, formula?: string }`。
3. 深拷贝性能 (Deep Copy)
   - 现状：历史记录和 `getData` 使用 JSON 序列化进行深拷贝。
   - 风险：`JSON.parse(JSON.stringify(data))` 在频繁操作（如拖拽调整大小时触发）或数据量大时极其消耗 CPU。
   - 建议：对于纯数据结构，可以使用 `structuredClone`（如果环境支持）或手动实现的浅拷贝/Immutable 更新策略来优化撤销/重做栈的性能。
