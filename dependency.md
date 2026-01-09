# 依赖管理文档

本文档记录项目依赖的更新历史和重要变更。

## Element Plus 更新

### 2024 - Element Plus 更新至 2.13.0

**更新日期**: 当前日期  
**更新内容**:

- `element-plus`: `^2.4.0` → `^2.13.0`
- `@element-plus/icons-vue`: `^2.3.0` → `^2.3.2`

**破坏性变更注意事项**:

1. **浏览器支持要求** (Element Plus 2.5.0+):

   - Chrome ≥ 85
   - Edge ≥ 85
   - Firefox ≥ 79
   - Safari ≥ 14.1
   - 如果项目需要支持旧版本浏览器，可能需要添加 Babel 和相应的 Polyfill

2. **Sass 配置** (Element Plus 2.8.5+):
   - 项目已配置 Sass 使用现代编译器 API（`vite.config.js` 中已设置 `scss.api: "modern-compiler"`）
   - 当前 Sass 版本 `^1.89.2` 满足最低要求（≥ 1.79.0）

**使用位置**:

- `src/main.js`: Element Plus 全局注册
- `src/options.js`: Element Plus 全局注册
- 项目中的多个 Vue 组件使用 Element Plus 组件

**相关文件**:

- `package.json`: 依赖版本定义
- `vite.config.js`: 构建配置（已包含 Sass 现代编译器配置）
- `README.md`: 项目文档中的依赖版本信息

## TypeScript 支持

### 2024 - 添加 TypeScript 支持

**更新日期**: 当前日期  
**更新内容**:

- `typescript`: ^5.9.3 (新增)
- `vue-tsc`: ^1.8.27 (新增)

**目的**:

- 将 Excel 组件重构为 TypeScript，提供类型安全
- 提升代码可维护性和开发体验
- 增强 IDE 智能提示和类型检查

**转换范围**:

- ✅ `src/composables/Excel/`: 所有 18 个 composables 已转换为 TypeScript
  - constants.ts
  - types.ts (共享类型定义)
  - useExcelData.ts
  - useHistory.ts
  - useCellEditing.ts
  - useSelection.ts
  - useColumnWidth.ts
  - useRowHeight.ts
  - useFillHandle.ts
  - useClipboard.ts
  - useCellDisplay.ts
  - useSizeManager.ts
  - useSelectionStyle.ts
  - useMouseEvents.ts
  - useDataSync.ts
  - useCellMenu.ts
  - useCellMenuPosition.ts
  - useRowOperations.ts
  - useResizeHandlers.ts
  - useKeyboard.ts
  - useExcelExport.ts
- ✅ `src/Components/Common/Excel.vue`: 主组件已转换为 TypeScript
- ✅ `src/Components/Excel/`: 所有子组件已转换为 TypeScript
  - CellMenu.vue
  - FillHandle.vue
  - ColumnResizer.vue
  - RowResizer.vue

**类型定义**:

- 所有 composables 都提供了完整的 TypeScript 接口定义
- 共享类型定义在 `src/composables/Excel/types.ts`
- 组件 Props 和 Emits 使用 TypeScript 类型系统

**相关文件**:

- `tsconfig.json`: TypeScript 配置文件
- `package.json`: 依赖版本定义
- `src/composables/Excel/types.ts`: 共享类型定义

## 依赖版本说明

### 核心依赖

- `vue`: ^3.4.0
- `pinia`: ^2.1.0 (在 README 中提及，但未在 package.json 中列出)
- `element-plus`: ^2.13.0
- `@element-plus/icons-vue`: ^2.3.2

### 构建工具

- `vite`: ^5.0.0
- `@vitejs/plugin-vue`: ^5.0.0
- `typescript`: ^5.3.3
- `vue-tsc`: ^1.8.27

### 其他依赖

- `@codemirror/*`: 代码编辑器相关
- `xlsx`: Excel 文件处理
- `sass`: CSS 预处理器
- `pinia-plugin-persistedstate`: Pinia 持久化插件
