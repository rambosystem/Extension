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
│   │   ├── ExcelKeySetting.vue        # Excel 键设置
│   │   ├── TranslationForm.vue       # 翻译表单
│   │   └── TranslationResultDialog.vue # 翻译结果对话框
│   └── Upload/          # 上传相关组件
│       └── UploadSettingsDialog.vue  # 上传设置对话框
├── composables/         # 组合式函数
│   ├── Core/            # 核心功能
│   │   ├── useI18n.js           # 国际化
│   │   ├── useSettings.js       # 设置管理
│   │   ├── useState.js          # 状态管理
│   │   └── useStorage.js        # 存储管理
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
│   ├── settings.js      # 设置状态
│   ├── terms.js         # 术语状态
│   └── translation.js   # 翻译状态
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

#### 2. Settings Store (`stores/settings.js`)

- **用途**: 管理应用设置
- **状态**:
  - `apiKey`: DeepSeek API 密钥
  - `lokaliseApiToken`: Lokalise API Token
  - `translationPrompt`: 翻译提示开关
  - `autoDeduplication`: 自动去重开关
  - `similarityThreshold`: 相似度阈值
  - `topK`: Top K 参数
  - `maxNGram`: 最大 N-gram
  - `excelBaselineKey`: Excel 基线键
  - `deduplicateProject`: 去重项目选择
  - `adTerms`: 公共术语库状态
- **主要方法**:
  - `saveApiKey()`: 保存 API 密钥
  - `saveLokaliseApiToken()`: 保存 Lokalise Token
  - `saveCustomPrompt()`: 保存自定义提示
  - `toggleTranslationPrompt()`: 切换翻译提示
  - `toggleAutoDeduplication()`: 切换自动去重

#### 3. Translation Store (`stores/translation.js`)

- **用途**: 管理翻译相关状态
- **状态**:
  - `codeContent`: 待翻译内容
  - `translationResult`: 翻译结果
  - `dialogVisible`: 翻译结果对话框显示状态
  - `uploadDialogVisible`: 上传对话框显示状态
  - `isTranslating`: 翻译进行状态
  - `loadingStates`: 各种加载状态
  - `hasLastTranslation`: 是否有上次翻译
  - `lastTranslation`: 上次翻译结果
- **主要方法**:
  - `handleTranslate()`: 处理翻译
  - `continueTranslation()`: 继续翻译
  - `showLastTranslation()`: 显示上次翻译
  - `handleClear()`: 清除内容
  - `saveTranslationToLocal()`: 保存翻译到本地
  - `loadLastTranslation()`: 加载上次翻译

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

## 开发准则

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
