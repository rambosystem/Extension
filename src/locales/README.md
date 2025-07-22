# 国际化 (i18n) 功能说明

## 概述

本项目已实现完整的国际化功能，支持英文 (en) 和中文 (zh_CN) 两种语言。

## 文件结构

```
src/locales/
├── en.json          # 英文语言包
├── zh_CN.json       # 中文语言包
└── README.md        # 说明文档
```

## 使用方法

### 1. 在组件中使用

```javascript
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();

// 使用文案
const message = t("translation.translate"); // 获取翻译文案
```

### 2. 在模板中使用

```vue
<template>
  <el-button>{{ t("translation.translate") }}</el-button>
  <el-form-item :label="t('translation.enCopywriting')">
    <!-- 内容 -->
  </el-form-item>
</template>

<script setup>
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();
</script>
```

### 3. 切换语言

用户可以通过设置页面切换语言：

#### 设置页面切换

- 进入 "设置" → "高级设置"
- 找到 "语言" 选项
- 通过下拉菜单选择语言
- 自动保存并生效

支持的语言：

- English (英文) - 默认语言
- 中文 (中文) - 完整翻译

## 语言包结构

### 通用文案 (common)

- `cancel`: 取消按钮
- `confirm`: 确认按钮
- `save`: 保存按钮
- `clear`: 清除按钮
- `loading`: 加载中提示
- `success`: 成功提示
- `error`: 错误提示
- `warning`: 警告提示

### 菜单文案 (menu)

- `tools`: 常用工具
- `translation`: 国际化翻译
- `settings`: 设置
- `about`: 关于

### 翻译功能文案 (translation)

- `title`: 翻译页面标题
- `enCopywriting`: 英文文案标签
- `translate`: 翻译按钮
- `lastTranslation`: 上次翻译按钮
- `translationResult`: 翻译结果对话框标题
- `translating`: 翻译中提示
- `exportCSV`: 导出 CSV 按钮
- `exportCSVAndUpload`: 导出 CSV 并上传按钮
- `noPreviousTranslation`: 没有找到上次翻译结果
- `noTranslationData`: 没有翻译数据可导出
- `translationCompleted`: 翻译完成提示
- `pleaseEnterContent`: 请输入要翻译的内容
- `pleaseConfigureAPIKey`: 请配置 API 密钥提示
- `translationFailed`: 翻译失败提示

### 设置功能文案 (settings)

- `title`: 设置页面标题
- `apiKey`: API 密钥标签
- `apiKeyForDeepSeek`: DeepSeek API 密钥
- `lokaliseProjectUploadURL`: Lokalise 项目上传 URL
- `customTranslationPrompt`: 自定义翻译提示
- `advancedSettings`: 高级设置
- `language`: 语言设置
- `clearLocalStorage`: 清除本地存储
- `clearLocalStorageConfirm`: 清除本地存储确认
- `clearLocalStorageSuccess`: 清除本地存储成功
- `clearLocalStorageFailed`: 清除本地存储失败
- `saveSuccessful`: 保存成功
- `saveFailed`: 保存失败
- `pleaseEnterPrompt`: 请输入提示
- `pleaseEnterValue`: 请输入值

### CSV 导出文案 (csvExport)

- `csvDownloaded`: CSV 文件下载成功
- `csvExportFailed`: 导出 CSV 文件失败
- `lokaliseUploadFailed`: 打开 Lokalise 上传页面失败

### 存储功能文案 (storage)

- `loadFailed`: 加载上次翻译结果失败
- `saveFailed`: 保存翻译结果到本地存储失败

### 关于页面文案 (about)

- `title`: 关于页面标题
- `content`: 关于页面内容

## 添加新文案

1. 在 `en.json` 中添加英文文案
2. 在 `zh_CN.json` 中添加对应的中文文案
3. 在代码中使用 `t('key.path')` 获取文案

## 技术实现

- 使用 Vue 3 Composition API
- 基于 localStorage 的语言持久化
- 支持嵌套键值访问
- 自动回退到默认语言
- 响应式语言切换

## 注意事项

1. 所有文案都应该通过 `t()` 函数获取，不要硬编码
2. 新增文案时需要在两个语言包中都添加对应翻译
3. 语言切换会立即生效，无需刷新页面
4. 语言选择会保存到 localStorage，下次访问时自动应用
