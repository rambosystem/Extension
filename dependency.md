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

## 依赖版本说明

### 核心依赖

- `vue`: ^3.4.0
- `pinia`: ^2.1.0 (在 README 中提及，但未在 package.json 中列出)
- `element-plus`: ^2.13.0
- `@element-plus/icons-vue`: ^2.3.2

### 构建工具

- `vite`: ^5.0.0
- `@vitejs/plugin-vue`: ^5.0.0

### 其他依赖

- `@codemirror/*`: 代码编辑器相关
- `xlsx`: Excel 文件处理
- `sass`: CSS 预处理器
- `pinia-plugin-persistedstate`: Pinia 持久化插件
