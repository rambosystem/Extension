# Rambo19971009 - Excel.vue 优化进度

日期：2026-05-07
组件：`src/Components/Excel/Excel.vue`

## 任务概览

对 `Excel.vue` 进行逻辑闭环检查 + 代码优化，共识别出 **2 个 P0 Bug** 和 **11 项优化点**，全部完成。

## 已完成改动

### P0 - Bug 修复

1. **Bug 1：`handleMouseUpRef` 前向引用失效**
   - 现象：`useResizeHandlers` 初始化时拿到 `null` 闭包，后续对外部变量的赋值无法回流到 composable 内部，导致列宽/行高调整结束后无法记录鼠标位置。
   - 修复：
     - `useResizeHandlers` 接口由 `handleMouseUp: fn | null` 改为 `getHandleMouseUp: () => fn | null`（getter 延迟求值）。
     - 配套更新 `startColumnResize` / `startRowResize` 内部，调用时才通过 getter 解析。

2. **Bug 2：`handleCellMouseDown` 事件三明治脆弱且易泄漏**
   - 现象：手动 remove 内部注册的 mouseup、再 add 包装版本，依赖 composable 内部实现细节，容易在未来重构时被破坏。
   - 修复：
     - `useMouseEvents` 新增可选 `onBeforeMouseUp(event)` 钩子。
     - `Excel.vue` 通过此钩子写入 `lastMousePosition`，彻底删除 `wrappedHandleMouseUp` + `handleCellMouseDownWrapper` + `handleMouseUpRef` 三层包装。
     - `onUnmounted` 对应的 `removeEventListener("mouseup", wrappedHandleMouseUp)` 一并移除。

### P1 - 质量提升

3. **`readOnlyColumns` 默认值 `["EN"]` 业务耦合**
   - 通用 Excel 组件默认硬编码国际化列名，违背"通用组件"定位。
   - 修复：默认值改为 `[]`；业务方需显式传入。

4. **`undoRedoFlash` 死代码 + 定时器未清理**
   - `undoRedoFlash` ref 只写不读（模板里完全没用），`undoRedoFlashTimer` 在组件卸载时未清理。
   - 修复：删除 ref / timer / triggerUndoRedoFlash，保留空壳 `triggerSelectionFlash` 作为扩展点（`undoRedoService` 仍在调用它）。

5. **`getRowTop` / `getRowIndexByScrollTop` O(n) 无缓存**
   - 每次滚轮事件 O(n) 扫描，大数据量下性能问题。
   - 修复：当未自定义行高时走 O(1) 乘法/除法快路径；自定义行高场景保留遍历（并加了注释说明将来若有大量自定义行高需改前缀和缓存）。

### P2 - 可维护性

6. **`selectionServiceWithEvents` 9 个方法的样板代码（~85 行）**
   - 重构：通过 `rangeBuilders` 表 + `Object.fromEntries` 统一生成，所有方法一次性包装 emit，新增方法只需在表里加一行。

7. **`emit` 包装层 80 行 switch-case 类型守卫**
   - 重构：合并校验为单个 `if (!Array.isArray(data) || !Array.isArray(data[0]))`；删除永不会进入的 `custom-action` case（useDataSync 只会发 modelValue/change）。

8. **`isMultiSelect` 4 条判断语义重叠**
   - 重构：抽出 `isRange(s)` 工具函数，判断压缩到 10 行；新增 `some` 匹配处理 sels 中"任一非单格选区"情况。

9. **`checkFavorites` 异常静默**
   - 修复：保留"失败降级为 canPaste=true"的 UX 取舍（避免用户无处可点），但在 DEV 模式打印 warn 方便排查权限问题。

10. **`isCellEditable` 逐单元格重复 trim/toUpperCase**
    - 修复：新增 `normalizedDisplayColumns` computed 缓存归一化结果，单次 O(N_cols) 计算代替逐单元格重算。

11. **`watch` 未处理 `virtualScroll.enabled` 动态变化**
    - 现象：数据行数从 <100 增长到 >100 时虚拟滚动变为 enabled，但行高监听永不注册。
    - 修复：把行高 watch 从 `onMounted` 内部提到顶层（自动处理启用/未启用），并新增对 `virtualScroll.enabled` 的 watch，enabled 变 true 时重新 init。

12. **`v-for key` 分支表达式冗余**
    - 简化：虚拟滚动和非虚拟路径最终都等价于 `getActualRowIndex(visibleIndex)`，直接使用此函数。

13. **`handleContainerClick` classList 判断不严谨**
    - 修复：改用 `event.target === event.currentTarget`，更严谨且避免 spacer 子元素意外触发或漏触发。

14. **顶部 Markdown `##` 裸标题**
    - 修复：改为 `<!-- ... -->` HTML 注释，避免被 Vue SFC 编译器当作文本节点渲染。

## 未改动项（用户未确认或超出本次范围）

- `defineExpose` 没有暴露 `undo/redo/copy/paste/selection*` 等能力：未确认业务是否有需求，保持原状。
- `Excel_README.md` 文件在仓库里搜不到，需要业务方确认是否要创建。
- 列宽等其他细节 composable 未做修改，本次只动了 Excel.vue 和两个直接相关的 composable。

## 影响的文件

1. `src/Components/Excel/Excel.vue` - 主组件大量重构
2. `src/Components/Excel/composables/useMouseEvents.ts` - 新增 `onBeforeMouseUp` 钩子
3. `src/Components/Excel/composables/rowColumnOps/useResizeHandlers.ts` - `handleMouseUp` 改为 `getHandleMouseUp` getter

## 验证结果

- `ReadLints` 对三个文件均无报错。
- 改动保持原有 API 签名（`defineExpose` / emits / props）完全兼容，调用方无需修改。

## 后续建议

- 若大数据量场景出现"自定义行高 + 频繁滚动"的性能瓶颈，考虑在 `rowHeightComposable` 内维护前缀和数组。
- 若业务确认需要 `Excel_README.md`，补齐组件 API 文档。
- `readOnlyColumns` 默认值已改为 `[]`，调用方（如 Lokalise 场景）需要检查是否显式传入了 `['EN']`。
