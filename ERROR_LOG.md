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

---

## Store 内部调用其他 Store 错误

### 问题描述

在 `translation.js` store 的 `initializeTranslationSettings` 方法中调用了 `useSettingsStore()`，导致运行时错误：

```
ReferenceError: useSettingsStore is not defined
```

### 原因

在 Pinia store 内部不能直接调用其他 store，这会导致循环依赖和初始化问题。

### 解决方案

将 store 内部对其他 store 的调用改为直接从 localStorage 读取：

```javascript
// ❌ 错误：在 store 内部调用其他 store
const settingsStore = useSettingsStore();
this.selectedProject = settingsStore.deduplicateProject || "AmazonSearch";

// ✅ 正确：直接从 localStorage 读取
const deduplicateProject = localStorage.getItem(
  "deduplicate_project_selection"
);
if (deduplicateProject) {
  this.selectedProject = deduplicateProject;
}
```

### 修复文件

- `src/stores/translation.js` - `initializeTranslationSettings` 方法

### 规则

**永远不要在 Pinia store 内部调用其他 store**，应该直接从数据源（localStorage、API 等）读取数据。

---

## 去重按钮不生效问题

### 问题描述

点击去重按钮后，去重对话框没有显示，按钮点击不生效。

### 原因

在 `useDeduplicateDialog.js` 中，直接返回 store 的属性值，但这些值不是响应式的：

```javascript
// ❌ 错误：直接返回 store 属性，不是响应式的
return {
  deduplicateDialogVisible: translationStore.deduplicateDialogVisible,
  selectedProject: translationStore.selectedProject,
  // ...
};
```

### 解决方案

使用 `computed` 包装 store 属性，确保响应式：

```javascript
// ✅ 正确：使用 computed 确保响应式
return {
  deduplicateDialogVisible: computed(
    () => translationStore.deduplicateDialogVisible
  ),
  selectedProject: computed(() => translationStore.selectedProject),
  // ...
};
```

### 修复文件

- `src/composables/Translation/useDeduplicateDialog.js`

### 规则

**从 store 返回状态时，必须使用 `computed` 包装以确保响应式**。
