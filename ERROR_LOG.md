# 错误日志

## Pinia Store 初始化错误

### 报错

```
Uncaught TypeError: Cannot read properties of undefined (reading '_s')
```

### 原因

在模块顶层调用 Pinia store，导致在 Pinia 初始化前就访问 store：

```javascript
// ❌ 错误：在模块顶层调用
const settingsStore = useSettingsStore();
```

### 解决

将 store 调用移到函数内部：

```javascript
// ✅ 正确：在函数内部调用
export function useLokaliseUpload() {
  const settingsStore = useSettingsStore();
}
```

### 修复文件

- `src/composables/Upload/useLokaliseUpload.js`
- `src/composables/Translation/useDeduplicateDialog.js`

### 规则

**永远不要在模块顶层调用 Pinia store**，必须在组件或函数内部调用。
