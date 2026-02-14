# Progress compaction

## 2025-02-14: 单词查词流式逐行展示

**目标**：流式中每返回一行就展示一行；word_header 作为单独一行，entry 内 entry_row / entry_example / entry_example_translation 按字段逐行展示。

**改动**：
1. **translateService.js**  
   - 新增 `extractPartialEntryObject(str)`：从不完整 JSON 对象片段中用正则 + `parseJsonStringValue` 解析已完整的四个字段（支持 `\"` 转义）。  
   - `parsePartialWordResult` 增加返回值 `partialEntry`：遍历 buffer 时用 `start` 记录当前未闭合 entry 的 `{` 下标；循环结束后若 `start !== -1`，对 `buffer.slice(start)` 做字段提取，得到 `partialEntry`。  
   - 返回形如 `{ pronunciation, entries, partialEntry }`。

2. **useTranslateWord.js**  
   - `partialResult` 含 `partialEntry`。  
   - 更新条件：`partial.pronunciation || partial.entries.length > 0 || hasPartialEntry` 时写 `partialResult.value = partial`。

3. **TranslatePopup.vue**  
   - `displayData`：在有 `partialEntry` 且非空时也视为有数据。  
   - `displayEntries`：`displayData.entries` 与（若有）`displayData.partialEntry` 拼成一条列表，用于 `v-for`。  
   - 模板：word_header 单独一块（第一行）；词条用 `displayEntries`，每条内 `entry_row` / `entry_example` / `entry_example_translation` 分别用 `v-if="entry.part_of_speech && entry.meaning"`、`v-if="entry.example"`、`v-if="entry.example_translation"` 控制，流式完成一行即展示一行。

**轨迹**：解析层支持未闭合 entry 的按字段提取 → composable 传递 partialEntry → 弹窗按行条件渲染。
