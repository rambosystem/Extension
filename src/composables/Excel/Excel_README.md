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
- [更新日志](#更新日志)

## 概述

Excel 组件是一个功能完整的类 Excel 表格组件，支持单元格编辑、选择、复制粘贴、撤销重做、智能填充、列宽/行高调整、数据管理（v-model 双向绑定）、单元格菜单等功能。组件采用 Vue 3 Composition API 开发，通过 Composables 实现模块化设计，保证代码的可维护性和可复用性。

### 核心特性

- **动态行列支持**: 组件会根据实际数据自动调整行列数，无需手动配置
- **自动扩展**: 编辑单元格或粘贴数据时，如果超出当前范围会自动扩展行列
- **列标题生成**: 支持超过 26 列（A-Z, AA-AZ, BA-BZ...）
- **智能数据管理**: 通过 v-model 双向绑定，数据变化自动同步
- **模块化架构**: 功能拆分为独立的 Composables，职责清晰，易于维护

### 设计原则

- **自包含**: 通用组件不依赖 Store，每个实例拥有独立状态
- **模块化**: 功能拆分为独立的 Composables，职责清晰
- **可复用**: 可在任何 Vue 3 项目中使用
- **类型安全**: 完整的 JSDoc 类型注释

## 架构设计

### 组件架构图

```
Excel.vue (组件)
├── 核心数据管理
│   ├── useExcelData (数据管理)
│   │   ├── tableData (表格数据)
│   │   ├── columns (列标题)
│   │   ├── rows (行索引)
│   │   └── 数据操作方法
│   └── useDataSync (数据同步)
│       ├── v-model 双向绑定
│       └── 外部数据同步
├── 选择与导航
│   ├── useSelection (选择逻辑)
│   │   ├── activeCell (活动单元格)
│   │   ├── selectionStart/End (选区)
│   │   └── 选择相关方法
│   └── useSelectionStyle (选区样式)
│       ├── 选区边框样式
│       └── 拖拽区域样式
├── 编辑功能
│   ├── useCellEditing (单元格编辑)
│   │   ├── 编辑状态管理
│   │   ├── 输入框处理
│   │   └── 编辑相关方法
│   └── useCellDisplay (显示样式)
│       ├── 文本宽度计算
│       └── 显示策略（换行/省略）
├── 交互处理
│   ├── useMouseEvents (鼠标事件)
│   │   ├── 单元格点击
│   │   ├── 拖拽选择
│   │   └── 鼠标抬起处理
│   ├── useKeyboard (键盘处理)
│   │   ├── 导航键处理
│   │   ├── 撤销/重做
│   │   └── 直接输入
│   └── useClipboard (剪贴板)
│       ├── 复制操作
│       └── 粘贴操作
├── 尺寸管理
│   ├── useSizeManager (尺寸管理)
│   │   ├── 列宽获取
│   │   └── 行高获取
│   ├── useColumnWidth (列宽管理)
│   │   ├── columnWidths (列宽状态)
│   │   ├── 拖拽调整
│   │   └── 自适应列宽
│   ├── useRowHeight (行高管理)
│   │   ├── rowHeights (行高状态)
│   │   ├── 拖拽调整
│   │   └── 自适应行高
│   └── useResizeHandlers (尺寸调整处理器)
│       ├── 列宽调整处理
│       └── 行高调整处理
├── 填充功能
│   └── useFillHandle (智能填充)
│       ├── 填充手柄显示
│       ├── 拖拽填充
│       └── 智能值计算
├── 菜单功能
│   ├── useCellMenu (单元格菜单)
│   │   ├── 删除行
│   │   └── 插入行
│   └── useCellMenuPosition (菜单位置管理)
│       ├── 菜单显示位置计算
│       └── 菜单上下文创建
├── 行操作
│   └── useRowOperations (行操作管理)
│       ├── 统一插入行处理
│       └── 统一删除行处理（支持多行）
└── 历史记录
    └── useHistory (历史记录)
        ├── historyStack (历史栈)
        └── undo/redo 功能
```

### 数据流向

```
用户操作 → Excel.vue → Composables → 状态更新 → UI 响应
外部数据 → useDataSync → useExcelData → tableData → UI 更新
```

## 文件结构

```
src/composables/Excel/
├── Excel_README.md         # 本文档
├── constants.js            # 常量定义
├── useExcelData.js         # 数据管理
├── useSelection.js         # 选择逻辑
├── useHistory.js           # 历史记录
├── useKeyboard.js          # 键盘处理
├── useColumnWidth.js       # 列宽管理
├── useRowHeight.js         # 行高管理
├── useFillHandle.js        # 智能填充
├── useExcelExport.js       # Excel 导出（独立功能）
├── useCellEditing.js       # 单元格编辑管理
├── useClipboard.js         # 剪贴板管理
├── useCellDisplay.js       # 单元格显示样式管理
├── useSizeManager.js       # 尺寸管理
├── useSelectionStyle.js   # 选区样式管理
├── useMouseEvents.js      # 鼠标事件管理
├── useDataSync.js         # 数据同步管理
├── useCellMenu.js         # 单元格菜单管理
├── useCellMenuPosition.js # 单元格菜单位置管理
├── useRowOperations.js    # 行操作管理
└── useResizeHandlers.js   # 尺寸调整处理器

src/Components/Common/
└── Excel.vue              # Excel 组件

src/Components/Excel/
├── CellMenu.vue           # 单元格菜单组件
├── FillHandle.vue         # 填充手柄组件
├── ColumnResizer.vue      # 列宽调整器组件
└── RowResizer.vue         # 行高调整器组件
```

## Composables API

### useExcelData

数据管理 Composable，负责表格数据的创建、管理和剪贴板操作。

**重要**: 组件支持动态行列，会根据 `initialData` 自动计算实际需要的行列数。如果提供了 `initialData`，行列数会根据数据自动调整；如果没有提供，则使用默认值。

#### 参数

```javascript
useExcelData({
  initialData?: string[][] // 初始数据，可选（如果提供，行列数会根据数据自动计算）
})
```

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
  clearData: () => void,  // 清空表格数据
  deleteRow: (rowIndex: number) => void,  // 删除行
  insertRowBelow: (rowIndex: number) => void  // 在指定行下方插入行
}
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
  multiSelections: Ref<Array<Range>>,  // 多选列表（MULTIPLE模式）
  isMultipleMode: Ref<boolean>,  // 是否处于多选模式
  startSingleSelection: (row: number, col: number) => void,  // 开始单格选择（SINGLE模式）
  updateSingleSelectionEnd: (row: number, col: number) => void,  // 更新单格选择终点
  startMultipleSelection: (row: number, col: number) => void,  // 开始多选（MULTIPLE模式）
  updateMultipleSelectionEnd: (row: number, col: number) => void,  // 更新多选终点
  endMultipleSelectionClick: (row: number, col: number) => void,  // 结束多选（Ctrl+点击）
  endMultipleSelectionDrag: (options: Object) => void,  // 结束多选（Ctrl+拖选）
  updateSelectionEnd: (row: number, col: number) => void,  // 更新选区终点（通用）
  isActive: (row: number, col: number) => boolean,  // 是否为活动单元格
  isInSelection: (row: number, col: number) => boolean,  // 是否在选区内
  isInSelectionHeader: (index: number, type: 'row' | 'col') => boolean,  // 是否在选区表头
  moveActiveCell: (rOffset: number, cOffset: number, maxRows: number, maxCols: number, extendSelection?: boolean) => void,  // 移动活动单元格
  clearSelection: () => void,  // 清除选择
  selectRow: (rowIndex: number, colsCount: number, isMultiple?: boolean) => void,  // 选择整行
  selectColumn: (colIndex: number, rowsCount: number, isMultiple?: boolean) => void,  // 选择整列
  selectRows: (startRow: number, endRow: number, colsCount: number) => void,  // 选择多行
  selectColumns: (startCol: number, endCol: number, rowsCount: number) => void,  // 选择多列
  selectAll: (rowsCount: number, colsCount: number) => void  // 全选
}
```

#### 选择模式说明

组件支持两种选择模式：

1. **SINGLE 模式**（普通选择）：

   - 点击或拖选单元格，只有一个选区
   - 使用 `selectionStart` 和 `selectionEnd` 记录选区
   - 通过 `normalizedSelection` 计算属性获取归一化选区

2. **MULTIPLE 模式**（Ctrl+选择）：
   - 按住 Ctrl/Cmd 键点击或拖选，可以有多个独立选区
   - 使用 `multiSelections` 数组存储多个选区
   - 支持 Ctrl+点击添加/移除选区
   - 支持 Ctrl+拖选添加/移除选区范围

**模式切换规则**：

- 从 MULTIPLE 模式切换到 SINGLE 模式时，清空多选列表
- 从 SINGLE 模式切换到 MULTIPLE 模式时，保留之前 SINGLE 模式的选区（加入 multiSelections）

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

### useRowHeight

行高管理 Composable，负责管理 Excel 组件的行高功能。

#### 参数

```javascript
useRowHeight({
  defaultHeight?: number,  // 默认行高，默认 36
  minHeight?: number,     // 最小行高，默认 20
  maxHeight?: number,     // 最大行高，默认 200
  rowsCount?: number      // 行数，默认 15
})
```

#### 返回值

```typescript
{
  rowHeights: Ref<Map<number, number>>,  // 行高映射表
  isResizingRow: Ref<boolean>,          // 是否正在调整行高
  resizingRowIndex: Ref<number | null>, // 正在调整的行索引
  getRowHeight: (rowIndex: number) => number,  // 获取行高
  startRowResize: (rowIndex: number, event: MouseEvent) => void,  // 开始调整行高
  handleRowResize: (event: MouseEvent) => void,  // 处理行高调整
  stopRowResize: () => void,  // 停止调整行高
  handleDoubleClickResize: (rowIndex: number, tableData: string[][], colsCount: number, getColumnWidth: Function) => void,  // 双击自适应行高
  autoFitRow: (rowIndex: number, tableData: string[][], colsCount: number, getColumnWidth: Function) => void  // 自适应行高
}
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

### useCellEditing

单元格编辑管理 Composable，负责管理单元格的编辑状态、输入框引用和编辑相关操作。

#### 参数

```javascript
useCellEditing({
  tableData: Ref<string[][]>,
  activeCell: Ref<{ row: number, col: number } | null>,
  startSingleSelection: Function,
  saveHistory: Function,
  moveActiveCell: Function,
  getMaxRows: () => number,
  getMaxCols: () => number,
  containerRef: Ref<HTMLElement | null>
});
```

#### 返回值

```typescript
{
  editingCell: Ref<{ row: number, col: number } | null>,  // 正在编辑的单元格
  isEditing: (row: number, col: number) => boolean,  // 判断是否正在编辑
  startEdit: (row: number, col: number, selectAll?: boolean) => void,  // 开始编辑
  stopEdit: () => void,  // 停止编辑
  cancelEdit: () => void,  // 取消编辑
  setInputRef: (el: HTMLElement | null, row: number, col: number) => void,  // 设置输入框引用
  handleInputEnter: (event: KeyboardEvent) => void,  // 处理 Enter 键
  handleInputTab: (event: KeyboardEvent) => void,  // 处理 Tab 键
  clearInputRefs: () => void  // 清理输入框引用
}
```

### useClipboard

剪贴板管理 Composable，负责处理 Excel 组件的复制和粘贴操作。

#### 参数

```javascript
useClipboard({
  editingCell: Ref<{ row: number, col: number } | null>,
  normalizedSelection: ComputedRef<Range | null>,
  tableData: Ref<string[][]>,
  activeCell: Ref<{ row: number, col: number } | null>,
  rows: Ref<number[]>,
  columns: Ref<string[]>,
  generateClipboardText: Function,
  parsePasteData: Function,
  saveHistory: Function
});
```

#### 返回值

```typescript
{
  handleCopy: (event: ClipboardEvent) => void,  // 处理复制操作
  handlePaste: (event: ClipboardEvent) => void  // 处理粘贴操作
}
```

### useCellDisplay

单元格显示样式管理 Composable，负责计算单元格的显示样式（换行、省略号、对齐方式等）。

#### 参数

```javascript
useCellDisplay({
  tableData: Ref<string[][]>,
  getColumnWidth: (colIndex: number) => number,
  getRowHeight: (rowIndex: number) => number
});
```

#### 返回值

```typescript
{
  getTextDisplayWidth: (text: string) => number,  // 计算文本显示宽度
  getCellDisplayStyle: (rowIndex: number, colIndex: number) => {  // 获取单元格显示样式
    wrap: boolean,      // 是否换行
    ellipsis: boolean,  // 是否显示省略号
    align: string       // 对齐方式
  }
}
```

### useSizeManager

尺寸管理 Composable，负责管理列宽和行高的获取逻辑，处理默认值和用户自定义值。

#### 参数

```javascript
useSizeManager({
  props: ComponentProps,
  columnWidthComposable: Object | null,
  rowHeightComposable: Object | null,
});
```

#### 返回值

```typescript
{
  getColumnWidth: (colIndex: number) => number,  // 获取列宽
  getRowHeight: (rowIndex: number) => number     // 获取行高
}
```

### useSelectionStyle

选区样式管理 Composable，负责计算选区边框样式类和拖拽填充区域样式类。

#### 参数

```javascript
useSelectionStyle({
  normalizedSelection: ComputedRef<Range | null>,
  multiSelections: Ref<Array<Range>>,
  isMultipleMode: Ref<boolean>,
  isSelecting: Ref<boolean>,
  isInSelection: Function,
  isInDragArea: Function,
  fillHandleComposable: Object | null,
  props: ComponentProps
});
```

#### 返回值

```typescript
{
  getSelectionBorderClass: (row: number, col: number) => string[],  // 获取选区边框样式类
  isSelectionBottomRight: (row: number, col: number) => boolean,    // 判断是否为选区右下角
  getDragTargetBorderClass: (row: number, col: number) => string[],  // 获取拖拽区域边框样式类
  getMultipleDragBorderClass: (row: number, col: number) => string[]  // 获取多选模式下拖选边框样式类
}
```

**样式渲染规则**：

- **SINGLE 模式**：显示选区边框和背景色
- **MULTIPLE 模式**：只显示背景色，不显示边框（拖选过程中除外）
- **拖选过程**：多选模式下拖选时，显示当前拖选区域的边框

### useMouseEvents

鼠标事件管理 Composable，负责处理单元格鼠标事件、选择、拖拽等交互。

#### 参数

```javascript
useMouseEvents({
  isSelecting: Ref<boolean>,
  startSingleSelection: Function,
  updateSelectionEnd: Function,
  isEditing: Function,
  stopEdit: Function,
  handleFillDragEnter: Function,
  applyFill: Function,
  stopColumnResize: Function,
  stopRowResize: Function,
  props: ComponentProps,
  fillHandleComposable: Object | null,
  columnWidthComposable: Object | null,
  rowHeightComposable: Object | null,
  handleColumnResize: Function,
  handleRowResize: Function
});
```

#### 返回值

```typescript
{
  handleMouseUp: () => void,  // 处理鼠标抬起事件
  handleCellMouseDown: (row: number, col: number, maxRows: number, maxCols: number) => void,  // 处理单元格鼠标按下
  handleMouseEnter: (row: number, col: number) => void  // 处理鼠标进入单元格
}
```

### useDataSync

数据同步管理 Composable，负责处理 Excel 组件内部数据与外部 props 的双向同步。

#### 参数

```javascript
useDataSync({
  tableData: Ref<string[][]>,
  props: ComponentProps,
  getData: () => string[][],
  setData: (data: string[][]) => void,
  emit: Function
});
```

#### 返回值

```typescript
{
  notifyDataChange: () => void,  // 通知外部数据变化
  initDataSync: () => void,       // 初始化数据同步监听
  setDataWithSync: (data: string[][]) => void  // 设置数据（带同步标记）
}
```

### useCellMenu

单元格菜单管理 Composable，负责处理单元格菜单命令（删除行、插入行等）。

#### 参数

```javascript
useCellMenu({
  tableData: Ref<string[][]>,
  rows: Ref<number[]>,
  activeCell: Ref<{ row: number, col: number } | null>,
  columns: Ref<string[]>,
  saveHistory: Function,
  deleteRow: Function,
  insertRowBelow: Function,
  startSingleSelection: Function,
  notifyDataChange: Function
});
```

#### 返回值

```typescript
{
  handleCellMenuCommand: (command: { action: string, rowIndex: number }) => void  // 处理菜单命令
}
```

### useResizeHandlers

尺寸调整处理器管理 Composable，负责处理列宽和行高的调整操作（拖拽和双击自适应）。

#### 参数

```javascript
useResizeHandlers({
  props: ComponentProps,
  columnWidthComposable: Object | null,
  rowHeightComposable: Object | null,
  tableData: Ref<string[][]>,
  columns: Ref<string[]>,
  getColumnWidth: Function,
  handleMouseUp: Function,
  handleColumnResize: Function,
  handleRowResize: Function
});
```

#### 返回值

```typescript
{
  startColumnResize: (colIndex: number, event: MouseEvent) => void,  // 开始调整列宽
  startRowResize: (rowIndex: number, event: MouseEvent) => void,     // 开始调整行高
  stopColumnResize: () => void,                                       // 停止列宽调整
  stopRowResize: () => void,                                          // 停止行高调整
  handleDoubleClickResize: (colIndex: number) => void,                // 双击列边界自适应
  handleDoubleClickRowResize: (rowIndex: number) => void,             // 双击行边界自适应
  handleColumnResizeMove: (event: MouseEvent) => void,                // 列宽调整移动
  handleRowResizeMove: (event: MouseEvent) => void                    // 行高调整移动
}
```

### useCellMenuPosition

单元格菜单位置管理 Composable，负责计算和管理单元格菜单按钮的显示位置和上下文。

#### 参数

```javascript
useCellMenuPosition({
  editingCell: Ref<{ row: number, col: number } | null>,
  isSelecting: Ref<boolean>,
  isMultipleMode: Ref<boolean>,
  activeCell: Ref<{ row: number, col: number } | null>,
  normalizedSelection: ComputedRef<Range | null>,
  multiSelections: Ref<Array<Range>>,
  tableData: Ref<string[][]>,
  updateCell: Function,
  notifyDataChange: Function,
  getData: Function,
  setDataWithSync: Function
});
```

#### 返回值

```typescript
{
  cellMenuPosition: ComputedRef<{ row: number, col: number } | null>,  // 菜单按钮显示位置
  shouldShowCellMenu: (rowIndex: number, colIndex: number) => boolean,  // 是否显示菜单按钮
  createMenuContext: (rowIndex: number) => Object  // 创建菜单上下文对象
}
```

**显示逻辑**：

- 单选模式：显示在选区的最后一个单元格（右下角）
- 多选模式：显示在最后一个选区的最后一个单元格（右下角）
- 不在编辑状态且不在选择过程中时显示

### useRowOperations

行操作管理 Composable，负责处理行操作（插入行、删除行等）的统一逻辑。

#### 参数

```javascript
useRowOperations({
  tableData: Ref<string[][]>,
  rows: Ref<number[]>,
  activeCell: Ref<{ row: number, col: number } | null>,
  columns: Ref<string[]>,
  saveHistory: Function,
  insertRowBelow: Function,
  deleteRow: Function,
  startSingleSelection: Function,
  notifyDataChange: Function
});
```

#### 返回值

```typescript
{
  handleInsertRowBelow: (rowIndex: number) => void,  // 在指定行下方插入行
  handleDeleteRow: (rowIndexOrIndices: number | number[]) => void,  // 删除行（支持单行或多行）
  handleDeleteRows: (rowIndices: number[]) => void  // 删除多行
}
```

**功能说明**：

- 统一的插入/删除行处理，自动处理历史记录和数据同步
- 删除行后自动调整活动单元格位置
- 支持单行删除和多行删除（传入数组）

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

| Prop                 | 类型               | 默认值 | 说明                                                                |
| -------------------- | ------------------ | ------ | ------------------------------------------------------------------- |
| `enableColumnResize` | `boolean`          | `true` | 是否启用列宽调整功能（拖拽调整和双击自适应）                        |
| `enableRowResize`    | `boolean`          | `true` | 是否启用行高调整功能（拖拽调整和双击自适应）                        |
| `enableFillHandle`   | `boolean`          | `true` | 是否启用智能填充功能（填充手柄和拖拽填充）                          |
| `defaultColumnWidth` | `number \| Object` | `100`  | 默认列宽（像素），支持数字或 `{ key: number, others: number }` 对象 |
| `defaultRowHeight`   | `number`           | `36`   | 默认行高（像素）                                                    |
| `modelValue`         | `string[][]`       | `null` | v-model 绑定的表格数据（二维字符串数组）                            |
| `columnNames`        | `string[]`         | `null` | 自定义列标题，不提供则使用默认的 A, B, C...                         |
| `customMenuItems`    | `Array`            | `[]`   | 自定义菜单项配置数组（详见下方说明）                                |

#### customMenuItems 配置说明

自定义菜单项配置数组，每个配置项包含以下属性：

```typescript
{
  id: string,                    // 唯一标识
  label: string,                 // 显示文本
  shortcut?: string,              // 快捷键（可选，如 'Ctrl+Alt+A'）
  validate?: (context) => boolean,  // 验证函数，返回是否显示该菜单项（可选）
  disabled?: (context) => boolean  // 禁用函数，返回是否禁用该菜单项（可选）
}
```

**context 对象包含**：

- `normalizedSelection`: 当前选区
- `multiSelections`: 多选列表
- `isMultipleMode`: 是否处于多选模式
- `activeCell`: 活动单元格
- `rowIndex`: 行索引
- `tableData`: 表格数据
- `updateCell(row, col, value)`: 更新单元格函数
- `getData()`: 获取数据函数
- `setData(data)`: 设置数据函数

**示例**：

```javascript
const customMenuItems = [
  {
    id: "auto-increment",
    label: "自增填充",
    shortcut: "Ctrl+Alt+A",
    validate: (ctx) => ctx.normalizedSelection?.minCol === 0, // 只在第一列显示
  },
];
```

### 暴露的方法和属性

通过 `ref` 可以调用以下方法和访问属性：

| 方法/属性                         | 参数                                      | 返回值            | 说明                                       |
| --------------------------------- | ----------------------------------------- | ----------------- | ------------------------------------------ |
| `getData()`                       | -                                         | `string[][]`      | 获取表格数据的深拷贝                       |
| `setData(data)`                   | `data: string[][]`                        | `void`            | 设置整个表格数据                           |
| `updateCell(row, col, value)`     | `row: number, col: number, value: string` | `void`            | 更新单个单元格                             |
| `clearData()`                     | -                                         | `void`            | 清空所有单元格数据                         |
| `setColumnWidth(colIndex, width)` | `colIndex: number, width: number`         | `void`            | 设置指定列的宽度（仅在启用列宽调整时生效） |
| `tableData`                       | -                                         | `Ref<string[][]>` | 表格数据的响应式引用（只读）               |

### 事件

| 事件名              | 参数类型     | 说明                                                           |
| ------------------- | ------------ | -------------------------------------------------------------- |
| `update:modelValue` | `string[][]` | v-model 更新事件，数据变化时触发                               |
| `change`            | `string[][]` | 数据变化事件，返回深拷贝的数据                                 |
| `custom-action`     | `Object`     | 自定义菜单项点击事件，参数为 `{ id: string, context: Object }` |

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
- [x] **单元格菜单**: 支持删除行、插入行功能
- [x] **多选模式**: 支持 Ctrl/Cmd+点击或拖选创建多个独立选区
- [x] **行/列选择**: 支持点击行号选择整行，点击列标题选择整列
- [x] **全选功能**: 支持点击角单元格全选整个表格
- [x] **自定义菜单项**: 支持通过 `customMenuItems` prop 添加自定义菜单项
- [x] **多行删除**: 支持一次删除多行（通过菜单或键盘快捷键）

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
   - 默认行高: 36px

2. **双击自适应**: 双击行边界（resizer），自动根据该行的内容高度调整行高

   - 会检查该行所有单元格的内容高度
   - **智能计算**: 根据实际列宽计算换行后的行数，确保行高自适应与列宽自适应联动
   - 自动计算合适的行高（包含边距）

3. **手动触发**: 可以通过 `autoFitRow` 方法手动触发自适应

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

### 选择操作

| 操作                     | 功能                      |
| ------------------------ | ------------------------- |
| `点击单元格`             | 选择单个单元格            |
| `拖拽单元格`             | 选择单元格范围            |
| `Ctrl/Cmd + 点击单元格`  | 添加/移除单元格到多选     |
| `Ctrl/Cmd + 拖拽单元格`  | 添加/移除单元格范围到多选 |
| `点击行号`               | 选择整行                  |
| `Ctrl/Cmd + 点击行号`    | 添加/移除行到多选         |
| `拖拽行号`               | 选择多行                  |
| `点击列标题`             | 选择整列                  |
| `Ctrl/Cmd + 点击列标题`  | 添加/移除列到多选         |
| `拖拽列标题`             | 选择多列                  |
| `点击角单元格（左上角）` | 全选整个表格              |
| `点击空白区域`           | 清除选择                  |

### 编辑键

| 快捷键                 | 功能               |
| ---------------------- | ------------------ |
| `双击单元格`           | 开始编辑           |
| `Esc`                  | 取消编辑           |
| `Enter` (编辑中)       | 完成编辑并向下移动 |
| `Tab` (编辑中)         | 完成编辑并向右移动 |
| `Delete` / `Backspace` | 删除选中内容       |

### 操作键

| 快捷键                                 | 功能         |
| -------------------------------------- | ------------ |
| `Ctrl + Z` / `Cmd + Z`                 | 撤销         |
| `Ctrl + Y` / `Cmd + Y`                 | 重做         |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | 重做（Mac）  |
| `Ctrl + C` / `Cmd + C`                 | 复制         |
| `Ctrl + V` / `Cmd + V`                 | 粘贴         |
| `Delete` / `Backspace`                 | 删除选中内容 |

### 直接输入

- 选中单元格后直接输入字符，会自动开始编辑并替换内容

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
$border-color: #e4e7ed;
$primary-color: #409eff;
$selection-bg: rgba(64, 158, 255, 0.12);
$header-bg: #f5f7fa;
$header-active-bg: #e4e7ed;
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
     clearInputRefs();
   });
   ```

### ❌ 避免的做法

1. **不要直接修改响应式数据**: 使用提供的方法
2. **不要跳过边界检查**: 始终验证数组索引
3. **不要忘记清理**: 及时清理事件监听器和引用
4. **不要硬编码**: 使用常量文件管理配置

## 更新日志

### v2.2.0 (当前版本)

- ✅ **新增多选模式支持**

  - 支持 Ctrl/Cmd+点击或拖选创建多个独立选区
  - 新增 `multiSelections` 和 `isMultipleMode` 状态管理
  - 支持从多选模式切换到单选模式，自动清空多选列表
  - 支持从单选模式切换到多选模式，保留之前选区

- ✅ **新增行/列选择功能**

  - 支持点击行号选择整行，支持拖拽行号选择多行
  - 支持点击列标题选择整列，支持拖拽列标题选择多列
  - 支持 Ctrl/Cmd+点击行号/列标题添加到多选
  - 支持点击角单元格（左上角）全选整个表格
  - 支持点击空白区域清除选择

- ✅ **新增自定义菜单项功能**

  - 新增 `customMenuItems` prop，支持自定义菜单项配置
  - 支持菜单项显示/隐藏验证函数
  - 支持菜单项禁用状态函数
  - 支持快捷键配置
  - 新增 `custom-action` 事件，用于处理自定义菜单项点击

- ✅ **新增行操作管理 Composable**

  - 新增 `useRowOperations` composable，统一管理插入/删除行逻辑
  - 支持单行删除和多行删除（传入数组）
  - 自动处理历史记录和数据同步
  - 删除行后自动调整活动单元格位置

- ✅ **新增单元格菜单位置管理 Composable**

  - 新增 `useCellMenuPosition` composable，统一管理菜单按钮显示位置
  - 支持单选模式和多选模式的菜单位置计算
  - 提供菜单上下文创建函数，供自定义菜单项使用

- ✅ **优化选择逻辑**

  - 优化多选模式的选区合并算法
  - 改进活动单元格在多选模式下的显示逻辑
  - 优化选区边框样式，区分单选和多选状态

### v2.1.0

- ✅ **修复翻译功能错误**

  - 修复 `continueTranslation` 函数中 `finalResultWithKeys` 未定义的错误
  - 将 `finalResultWithKeys` 替换为正确的 `result` 变量
  - 确保翻译结果能够正确保存到本地存储

- ✅ **增强 Auto Increment 功能验证**

  - 添加 baseline key 存在性检查，未配置 baseline key 时禁止执行 auto increment
  - 添加 baseline key 格式验证，格式不正确时显示警告提示
  - 新增国际化提示信息：
    - `autoIncrementBaselineKeyRequired`: 提示用户需要先配置 baseline key
    - `autoIncrementBaselineKeyInvalid`: 提示 baseline key 格式无效
  - 提升用户体验，避免因配置缺失导致的错误

- ✅ **优化翻译处理状态样式**

  - 进度计数器样式优化，采用 Excel menu 中快捷键 label 的样式设计
    - 背景色：`#f0f1f2`
    - 圆角：`4px`
    - 内边距：`2px 6px`
    - 字体大小：`12px`
    - 字体颜色：`#4a4b4d`
    - 使用系统字体栈，保持视觉一致性
  - "Translating..." 文本颜色优化，从蓝色 (`#409eff`) 改为正文字体颜色 (`#303133`)
  - 加载图标颜色同步调整为正文字体颜色，保持整体视觉统一

### v2.0.0

- ✅ **重大重构：模块化架构优化**

  - 将 Excel 组件的 JavaScript 逻辑拆分为多个独立的 Composables
  - 新增 `useCellEditing`: 单元格编辑管理
  - 新增 `useClipboard`: 剪贴板管理
  - 新增 `useCellDisplay`: 单元格显示样式管理
  - 新增 `useSizeManager`: 尺寸管理
  - 新增 `useSelectionStyle`: 选区样式管理
  - 新增 `useMouseEvents`: 鼠标事件管理
  - 新增 `useDataSync`: 数据同步管理
  - 新增 `useCellMenu`: 单元格菜单管理
  - 新增 `useResizeHandlers`: 尺寸调整处理器
  - 代码组织更清晰，每个 composable 职责单一
  - 提升可维护性和可复用性

- ✅ **新增单元格菜单功能**

  - 支持删除行操作
  - 支持向下插入行操作
  - 菜单按钮显示在选中单元格右上角
  - 菜单激活时图标变为蓝色

- ✅ **组件提取**
  - 将 CellMenu 组件提取到 `src/Components/Excel/CellMenu.vue`
  - 保持组件结构清晰，便于维护

### v1.6.0

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

### v1.4.0

- ✅ 新增数据管理功能
- ✅ 支持 `v-model` 双向绑定
- ✅ 支持通过 `modelValue` prop 传入初始数据
- ✅ 支持 `@change` 事件监听数据变化
- ✅ 使用 `defineExpose` 暴露数据操作方法

### v1.3.0

- ✅ 新增行高管理功能 (`useRowHeight`)
- ✅ 支持拖拽调整行高
- ✅ 支持双击行边界自适应行高

### v1.2.0

- ✅ 新增智能填充管理功能 (`useFillHandle`)
- ✅ 添加 `enableFillHandle` prop

### v1.1.0

- ✅ 新增列宽管理功能 (`useColumnWidth`)
- ✅ 支持拖拽调整列宽
- ✅ 支持双击列边界自适应列宽

### v1.0.0

- ✅ 基础功能实现
- ✅ 模块化重构
- ✅ 完整的类型注释

## 贡献指南

1. 遵循现有代码风格
2. 添加 JSDoc 注释
3. 更新相关文档
4. 确保无 linter 错误
