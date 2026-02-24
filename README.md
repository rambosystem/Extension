# Penrose

基于 Vue 3 + Pinia + Element Plus 的浏览器扩展（支持 Edge / Chrome），提供翻译管理、术语库、剪贴板等能力。

## 功能概览

- **翻译**：集成 AI 翻译与 Lokalise，支持导出 Excel、去重等
- **术语库**：术语管理与嵌入检索
- **剪贴板**：栏剪贴板快捷访问
- **设置**：API 配置、翻译选项、高级设置

## 技术栈

Vue 3、Pinia、Element Plus、Vite、CodeMirror、xlsx。

## 开发与构建

```bash
# 安装依赖
npm install

# 开发模式（监听构建）
npm run dev

# 生产构建（含 content script）
npm run build
```

构建产物在 `dist/`，在浏览器扩展管理页面加载该目录即可。
