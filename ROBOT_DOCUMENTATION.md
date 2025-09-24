# Robot 开发文档

## 项目概述

这是一个基于 Vue 3 + Pinia + Element Plus 的 Chrome 扩展项目，主要用于翻译管理和术语库管理。项目采用现代化的前端架构，支持国际化，具有完整的状态管理和组件化开发。

## 技术栈

### 核心框架

- **Vue 3**: 使用 Composition API 和 `<script setup>` 语法
- **Pinia**: 状态管理库，替代 Vuex
- **Element Plus**: UI 组件库
- **TypeScript**: 部分组件使用 TypeScript

### 构建工具

- **Vite**: 构建工具和开发服务器
- **@vitejs/plugin-vue**: Vue 插件
- **CodeMirror**: 代码编辑器组件

### 开发工具

- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化（通过 ESLint 配置）

## 项目结构

```
src/
├── Components/           # 组件目录
│   ├── Common/          # 通用组件
│   │   ├── CodeEditor.vue      # 代码编辑器
│   │   ├── ConfirmDialog.vue   # 确认对话框
│   │   ├── EditableCell.vue    # 可编辑单元格
│   │   ├── LoadingButton.vue   # 加载按钮
│   │   └── SaveableInput.vue   # 可保存输入框
│   ├── Terms/           # 术语相关组件
│   │   ├── TermsCard.vue       # 术语卡片
│   │   └── Weight-Item.vue     # 权重项
│   ├── Translation/     # 翻译相关组件
│   │   ├── DeduplicateDialog.vue      # 去重对话框
│   │   ├── ExportSetting.vue          # 导出设置
│   │   ├── TranslationForm.vue       # 翻译表单
│   │   └── TranslationResultDialog.vue # 翻译结果对话框
│   └── Upload/          # 上传相关组件
│       └── UploadSettingsDialog.vue  # 上传设置对话框
├── composables/         # 组合式函数
│   ├── Core/            # 核心功能
│   │   └── useI18n.js           # 国际化
│   ├── Excel/           # Excel 相关
│   │   └── useExcelExport.js    # Excel 导出
│   ├── Translation/     # 翻译相关
│   │   ├── useDeduplicate.js           # 去重逻辑
│   │   ├── useDeduplicateDialog.js     # 去重对话框
│   │   ├── useTranslation.js          # 翻译核心
│   │   ├── useTranslationCache.js     # 翻译缓存
│   │   └── useTranslationStorage.js   # 翻译存储
│   └── Upload/          # 上传相关
│       └── useLokaliseUpload.js       # Lokalise 上传
├── config/              # 配置文件
│   └── prompts.js       # AI 提示词配置
├── locales/             # 国际化文件
│   ├── en.json          # 英文语言包
│   └── zh_CN.json       # 中文语言包
├── requests/            # API 请求
│   ├── cdn.js           # CDN 请求
│   ├── deepseek.js      # DeepSeek API
│   ├── lokalise.js      # Lokalise API
│   ├── termMatch.js     # 术语匹配 API
│   └── terms.js         # 术语管理 API
├── stores/              # Pinia 状态管理
│   ├── app.js           # 应用全局状态
│   ├── index.js         # Store 导出
│   ├── settings/        # 设置模块
│   │   ├── api.js       # API 设置
│   │   ├── translation.js # 翻译设置
│   │   └── index.js     # 设置模块导出
│   ├── translation/      # 翻译模块
│   │   ├── core.js      # 翻译核心功能
│   │   ├── upload.js    # 上传功能
│   │   ├── export.js    # 导出功能
│   │   ├── deduplicate.js # 去重功能
│   │   └── index.js     # 翻译模块导出
│   └── terms.js         # 术语状态
├── utils/               # 工具函数
│   └── apiValidation.js # API 验证
├── Views/               # 页面视图
│   ├── Settings.vue     # 设置页面
│   └── Translation.vue # 翻译页面
├── App.vue              # 弹窗应用
├── Options.vue          # 选项页面
├── main.js              # 弹窗入口
├── options.js           # 选项页面入口
└── style.css            # 全局样式
```

## 状态管理架构

### Pinia Stores

#### 1. App Store (`stores/app.js`)

- **用途**: 管理全局应用状态
- **状态**:
  - `currentMenu`: 当前选中的菜单项
  - `language`: 应用语言设置
  - `isInitialized`: 应用初始化状态
- **主要方法**:
  - `setCurrentMenu()`: 设置当前菜单
  - `setLanguage()`: 设置语言
  - `initializeApp()`: 初始化应用

#### 2. Settings Module (`stores/settings/`)

##### 2.1 API Store (`stores/settings/api.js`)

- **用途**: 管理 API 相关设置
- **状态**:
  - `apiKey`: DeepSeek API 密钥
  - `lokaliseApiToken`: Lokalise API Token
  - `loadingStates`: 加载状态
- **主要方法**:
  - `saveApiKey()`: 保存 API Key
  - `saveLokaliseApiToken()`: 保存 Lokalise Token
  - `initializeApiSettings()`: 初始化 API 设置

##### 2.2 Translation Settings Store (`stores/settings/translation.js`)

- **用途**: 管理翻译相关设置
- **状态**:
  - `translationPrompt`: 翻译提示开关
  - `autoDeduplication`: 自动去重开关
  - `customPrompt`: 自定义翻译提示
  - `similarityThreshold`: 相似度阈值
  - `topK`: Top K 值
  - `maxNGram`: 最大 N-gram 值
  - `deduplicateProject`: 去重项目选择
  - `adTerms`: 公共术语库状态
- **主要方法**:
  - `saveCustomPrompt()`: 保存自定义提示
  - `toggleTranslationPrompt()`: 切换翻译提示
  - `toggleAutoDeduplication()`: 切换自动去重
  - `updateSimilarityThreshold()`: 更新相似度阈值

#### 3. Translation Module (`stores/translation/`)

##### 3.1 Core Store (`stores/translation/core.js`)

- **用途**: 管理翻译核心功能
- **状态**:
  - `codeContent`: 待翻译内容
  - `translationResult`: 翻译结果
  - `dialogVisible`: 对话框可见性
  - `isTranslating`: 翻译状态
  - `userSuggestion`: 用户建议
  - `lastTranslation`: 上次翻译结果
- **主要方法**:
  - `handleTranslate()`: 执行翻译
  - `showLastTranslation()`: 显示上次翻译
  - `handleClear()`: 清除内容
  - `saveTranslationToLocal()`: 保存翻译到本地

##### 3.2 Upload Store (`stores/translation/upload.js`)

- **用途**: 管理上传功能
- **状态**:
  - `uploadDialogVisible`: 上传对话框可见性
  - `uploadForm`: 上传表单数据
  - `projectList`: 项目列表
  - `isUploading`: 上传状态
- **主要方法**:
  - `uploadToLokalise()`: 上传到 Lokalise
  - `executeUpload()`: 执行上传操作
  - `handleProjectChange()`: 处理项目变化

##### 3.3 Export Store (`stores/translation/export.js`)

- **用途**: 管理导出功能
- **状态**:
  - `excelBaselineKey`: Excel 基线键
  - `excelOverwrite`: Excel 覆盖设置
- **主要方法**:
  - `exportExcel()`: 导出 Excel 文件
  - `saveExcelBaselineKey()`: 保存 Excel 基线键
  - `updateExcelOverwrite()`: 更新 Excel 覆盖设置

##### 3.4 Deduplicate Store (`stores/translation/deduplicate.js`)

- **用途**: 管理去重功能
- **状态**:
  - `deduplicateDialogVisible`: 去重对话框可见性
  - `selectedProject`: 选中的去重项目
  - `isDeduplicating`: 去重状态
  - `isAutoDeduplicate`: 自动去重标志
- **主要方法**:
  - `executeDeduplicate()`: 执行去重操作
  - `handleDeduplicate()`: 处理去重操作
  - `handleShowAutoDeduplicateDialog()`: 显示自动去重对话框

#### 4. Terms Store (`stores/terms.js`)

- **用途**: 管理术语库状态
- **状态**:
  - `termsData`: 术语数据
  - `totalTerms`: 术语总数
  - `termsLoading`: 术语加载状态
  - `embeddingStatus`: 嵌入状态
  - `lastEmbeddingTime`: 最后嵌入时间
- **主要方法**:
  - `fetchTermsData()`: 获取术语数据
  - `addTerms()`: 添加术语
  - `deleteTerm()`: 删除术语
  - `rebuildEmbedding()`: 重建嵌入
  - `refreshTerms()`: 刷新术语

### Store 模块化架构

#### 🎯 **模块化优势**

1. **更好的可维护性**: 每个模块职责单一，便于维护和调试
2. **更清晰的边界**: 功能模块化，避免状态混乱
3. **更好的可扩展性**: 新增功能时可以独立添加模块
4. **更好的团队协作**: 不同开发者可以独立开发不同模块
5. **更好的测试性**: 每个模块可以独立测试

#### 📁 **模块结构说明**

- **Settings 模块**: 按功能领域拆分（API 设置 vs 翻译设置）
- **Translation 模块**: 按业务流程拆分（核心、上传、导出、去重）
- **向后兼容**: 通过 `index.js` 提供统一的 API 接口
- **渐进式迁移**: 可以逐步优化，不需要一次性重构所有代码

#### 🔄 **数据流向**

```
Component → Store Module → Sub-Store → Composable → API
     ↓           ↓            ↓           ↓
    UI交互    模块管理      功能管理     业务逻辑
```

## 开发准则

### Composables 与 Stores 的界限

#### 🎯 **基本原则**

1. **Stores 负责状态管理**：所有应用状态都应该通过 Pinia stores 管理
2. **Composables 负责业务逻辑**：封装可复用的业务逻辑和功能
3. **组件负责 UI 交互**：处理用户界面和用户交互

#### 📋 **Stores 职责**

**✅ Stores 应该负责：**

- 应用状态管理（数据存储、状态变更）
- 数据持久化（localStorage、API 调用）
- 状态同步和共享
- 业务规则验证
- 复杂的状态计算（getters）

**❌ Stores 不应该：**

- 直接操作 DOM
- 处理 UI 交互逻辑
- 包含组件特定的状态
- 调用其他 stores（避免循环依赖）

#### 🔧 **Composables 职责**

**✅ Composables 应该负责：**

- 封装可复用的业务逻辑
- 提供功能性的方法集合
- 处理复杂的数据转换
- 封装第三方库的使用
- 提供响应式的计算属性

**❌ Composables 不应该：**

- 直接管理应用状态（应该通过 stores）
- 直接操作 localStorage（应该通过 stores）
- 包含组件特定的 UI 逻辑

#### 🏗️ **架构模式**

```javascript
// ✅ 正确的架构模式

// Store: 状态管理
export const useTranslationStore = defineStore("translation", {
  state: () => ({
    codeContent: "",
    translationResult: [],
  }),
  actions: {
    async translate(content) {
      // 业务逻辑调用 composable
      const { performTranslation } = useTranslation();
      this.translationResult = await performTranslation(content);
    },
  },
});

// Composable: 业务逻辑
export function useTranslation() {
  const performTranslation = async (content) => {
    // 纯业务逻辑，不管理状态
    return await translateAPI(content);
  };

  return { performTranslation };
}

// Component: UI 交互
export default {
  setup() {
    const translationStore = useTranslationStore();

    const handleTranslate = () => {
      translationStore.translate(translationStore.codeContent);
    };

    return { handleTranslate };
  },
};
```

#### 🚫 **反模式示例**

```javascript
// ❌ 错误：Composable 直接管理状态
export function useTranslation() {
  const codeContent = ref(""); // 不应该在 composable 中管理状态
  const translationResult = ref([]);

  return { codeContent, translationResult };
}

// ❌ 错误：Store 调用其他 Store
export const useTranslationStore = defineStore("translation", {
  actions: {
    async translate() {
      const settingsStore = useSettingsStore(); // 避免循环依赖
      // ...
    },
  },
});

// ❌ 错误：组件直接操作 localStorage
export default {
  setup() {
    const saveData = () => {
      localStorage.setItem("data", "value"); // 应该通过 store
    };
  },
};
```

#### 📝 **命名规范**

- **Stores**: `use[Domain]Store` (如 `useTranslationStore`)
- **Composables**: `use[Feature]` (如 `useTranslation`, `useExcelExport`)
- **状态**: 使用 stores 中的状态
- **方法**: 通过 stores 的 actions 调用

#### 🔄 **数据流向**

```
Component → Store → Composable → API
    ↓         ↓         ↓
   UI交互   状态管理   业务逻辑
```

#### ⚠️ **重要规则**

1. **永远不要在模块顶层调用 Pinia store**
2. **永远不要在 Pinia store 内部调用其他 store**
3. **从 store 返回状态时，必须使用 `computed` 包装以确保响应式**
4. **Composables 应该保持纯函数特性，不管理状态**
5. **所有 localStorage 操作都应该通过 stores 进行**

### 1. 组件开发规范

#### 组件命名

- 使用 PascalCase 命名组件文件
- 组件名应具有描述性，如 `TranslationForm.vue`
- 通用组件放在 `Components/Common/` 目录

#### 组件结构

```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup>
// 导入依赖
import { ref, computed, watch } from "vue";
import { useI18n } from "../composables/Core/useI18n.js";

// 定义 props
const props = defineProps({
  // props 定义
});

// 定义 emits
const emit = defineEmits(["eventName"]);

// 使用 composables
const { t } = useI18n();

// 响应式数据
const data = ref("");

// 计算属性
const computedValue = computed(() => {
  // 计算逻辑
});

// 监听器
watch(
  () => props.value,
  (newValue) => {
    // 监听逻辑
  }
);

// 方法定义
const handleEvent = () => {
  // 处理逻辑
};
</script>

<style lang="scss" scoped>
/* 样式定义 */
</style>
```

#### Props 传递原则

- **避免 Props 爆炸**: 子组件应直接使用 Stores，而不是通过 Props 传递状态
- **父子传递**: 仅用于必要的配置和事件处理
- **单向数据流**: 子组件不应直接修改 Props

### 2. 状态管理规范

#### Store 使用

- 所有状态管理通过 Pinia Stores 进行
- 组件直接使用 Store，避免 Props 传递状态
- Store 方法应具有明确的职责和命名

#### 状态更新

- 通过 Store 的 actions 更新状态
- 避免直接修改 Store 的 state
- 使用响应式数据保持 UI 同步

### 3. 事件处理规范

#### 事件命名

- 使用 kebab-case 命名事件
- 事件名应具有描述性，如 `@update:modelValue`

#### 事件处理

- 子组件通过 `emit` 通知父组件
- 父组件处理业务逻辑
- 避免在子组件中处理复杂的业务逻辑

### 4. 国际化规范

#### 文本处理

- 所有用户可见文本使用 `t()` 函数
- 文本键使用点分隔的层级结构，如 `translation.form.title`
- 支持参数替换，如 `t('message.welcome', { name: 'John' })`

#### 语言包结构

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "translation": {
    "title": "Translation",
    "form": {
      "title": "Translation Form"
    }
  }
}
```

### 5. API 请求规范

#### 请求函数

- 所有 API 请求放在 `requests/` 目录
- 使用 async/await 处理异步请求
- 统一的错误处理机制

#### 错误处理

```javascript
export async function apiFunction() {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}
```

### 6. 样式规范

#### CSS 类命名

- 使用 BEM 命名规范
- 组件样式使用 `scoped` 属性
- 全局样式放在 `style.css`

#### 响应式设计

- 使用 Element Plus 的栅格系统

## 依赖管理

### 核心依赖

```json
{
  "vue": "^3.4.0",
  "pinia": "^2.1.0",
  "element-plus": "^2.4.0",
  "@element-plus/icons-vue": "^2.3.0"
}
```

### 构建依赖

```json
{
  "vite": "^5.0.0",
  "@vitejs/plugin-vue": "^4.5.0",
  "@codemirror/state": "^6.4.0",
  "@codemirror/view": "^6.22.0",
  "@codemirror/commands": "^6.3.0",
  "@codemirror/lang-javascript": "^6.2.0"
}
```

### 工具依赖

```json
{
  "xlsx": "^0.18.0"
}
```

## 构建配置

### Vite 配置 (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/main.js"),
        options: resolve(__dirname, "src/options.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith(".css")) {
            return "[name].css";
          }
          return "assets/[name]-[hash].[ext]";
        },
        manualChunks: {
          "vue-vendor": ["vue"],
          "element-plus": ["element-plus", "@element-plus/icons-vue"],
          codemirror: [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
            "@codemirror/lang-javascript",
          ],
          utils: ["xlsx"],
        },
      },
    },
  },
});
```

## 开发流程

### 1. 新功能开发

1. 在相应的 Store 中定义状态和方法
2. 创建或修改组件
3. 添加国际化文本
4. 编写 API 请求函数

### 2. 组件修改

1. 检查是否影响其他组件
2. 更新相关的 Store 状态
3. 确保 Props 和 Events 的正确性
4. 更新国际化文本

### 3. 状态管理修改

1. 检查 Store 的持久化配置
2. 确保状态更新的响应式
3. 验证组件间的状态同步
4. 测试状态重置和初始化

## 调试指南

### 1. 状态调试

- 使用 Vue DevTools 查看 Pinia Store 状态
- 检查 Store 的持久化数据
- 验证状态更新的时机

### 2. 组件调试

- 检查 Props 传递是否正确
- 验证事件发射和监听
- 确认组件的生命周期

### 3. API 调试

- 检查网络请求的 URL 和参数
- 验证响应数据的格式
- 确认错误处理机制

## 常见问题

### 1. 状态不同步

- 检查 Store 的持久化配置
- 确认组件正确使用 Store
- 验证状态更新的方法调用

### 2. 组件渲染问题

- 检查响应式数据的定义
- 确认计算属性的依赖
- 验证监听器的触发条件

### 3. 国际化问题

- 检查语言包的键值对应
- 确认 `t()` 函数的参数
- 验证语言切换的机制

## 性能优化

### 1. 组件优化

- 使用 `v-memo` 优化列表渲染
- 合理使用 `computed` 和 `watch`
- 避免不必要的重新渲染

### 2. 状态优化

- 使用 Store 的 `persist` 配置
- 避免过度的状态更新
- 合理使用缓存机制

### 3. 构建优化

- 使用 Vite 的代码分割
- 优化依赖包的加载
- 压缩和混淆生产代码

## 扩展指南

### 1. 添加新功能

1. 在相应的 Store 中添加状态和方法
2. 创建新的组件或修改现有组件
3. 添加必要的 API 请求函数
4. 更新国际化文本
5. 测试功能的完整性

### 2. 添加新页面

1. 在 `Views/` 目录创建新页面组件
2. 在 `Options.vue` 中添加菜单项
3. 在相应的 Store 中添加状态管理
4. 添加页面路由和导航逻辑

### 3. 添加新 API

1. 在 `requests/` 目录创建新的 API 文件
2. 定义请求和响应类型
3. 添加错误处理机制
4. 在 Store 中集成 API 调用

## 维护说明

### 1. 依赖更新

- 定期检查依赖包的安全更新
- 测试新版本的功能兼容性
- 更新构建配置以适应新版本

### 2. 代码维护

- 定期清理无用的代码和注释
- 优化组件和 Store 的性能
- 更新文档和注释

### 3. 功能维护

- 监控用户反馈和错误报告
- 及时修复发现的问题
- 持续改进用户体验

---

**最后更新**: 2024 年 12 月
**维护者**: Robot Development
**版本**: 1.0.0
