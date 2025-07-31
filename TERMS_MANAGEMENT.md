# Terms Management 功能说明

## 概述

本项目已重构terms管理功能，从本地存储改为基于API的远程管理。新的terms管理系统通过HTTP API从服务器获取terms数据，支持实时更新和错误处理。

## 主要变更

### 1. 删除的本地管理逻辑
- ❌ `src/config/defaultTerms.js` - 本地默认terms配置
- ❌ `src/composables/useTermsManger.js` - 旧的本地terms管理
- ❌ 所有本地terms缓存和存储逻辑

### 2. 新增的API管理逻辑
- ✅ `src/requests/terms.js` - Terms API请求管理
- ✅ `src/composables/useTermsManager.js` - 新的API-based terms管理
- ✅ 完整的错误处理和加载状态管理

## API接口规范

### 获取用户Terms数据
- **URL**: `http://43.142.250.179:8000/users/{user_id}/terms`
- **Method**: `GET`
- **Headers**: `Content-Type: application/json`

### 响应格式
```json
{
  "terms": [
    {
      "en": "string",
      "cn": "string", 
      "jp": "string"
    }
  ]
}
```

### 获取用户Terms状态信息
- **URL**: `http://43.142.250.179:8000/users/{user_id}/terms/status`
- **Method**: `GET`
- **Headers**: `Content-Type: application/json`

### 状态响应格式
```json
{
  "total_terms": 7,
  "embedding_status": true,
  "last_embedding_time": "2025-07-30 10:00:00"
}
```

**字段说明**：
- `total_terms`: 术语总数（必需，数字类型）
- `embedding_status`: embedding状态（必需，布尔类型）
- `last_embedding_time`: 最后embedding时间（可选，字符串类型，可为null或空字符串）

### 重建用户Embedding
- **URL**: `http://43.142.250.179:8000/embedding/build/user/{user_id}`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

### 重建响应格式
```json
{
  "message": "Embedding build task started",
  "user_id": 1,
  "status": "building"
}
```

**字段说明**：
- `message`: 响应消息（必需，字符串类型）
- `user_id`: 用户ID（必需，数字类型）
- `status`: 任务状态（必需，字符串类型）

## 功能特性

### 1. 按需数据获取
- 组件挂载时只获取状态信息（total_terms, embedding_status, last_embedding_time）
- terms数据只在需要时（如打开设置对话框）才获取
- 支持手动刷新功能
- 防止重复请求

### 2. 加载状态管理
- 显示加载动画
- 加载中禁用交互
- 清晰的加载提示

### 3. 错误处理
- 网络错误处理
- API错误响应处理
- 用户友好的错误提示
- 重试功能

### 4. 状态持久化
- Terms开关状态保存到localStorage
- 用户ID配置支持
- 跨会话状态保持

## 使用方法

### 在组件中使用

```javascript
import { useTermsManager } from "../composables/useTermsManager.js";

const { 
    termsStatus, 
    termsTitle, 
    totalTerms, 
    loading: termsLoading, 
    error: termsError,
    embeddingStatus,
    lastEmbeddingTime,
    updateTermStatus, 
    refreshTerms 
} = useTermsManager();
```

### 在模板中使用

```vue
<template>
  <TermsCard 
    :title="termsTitle" 
    :status="termsStatus" 
    :total-terms="totalTerms"
    :loading="termsLoading"
    :error="termsError"
    :embedding-status="embeddingStatus"
    :last-embedding-time="lastEmbeddingTime"
    @update:status="updateTermStatus"
    @refresh="refreshTerms" 
  />
</template>
```

## 配置说明

### 用户ID配置
默认从localStorage获取`user_id`，如果没有设置则使用`'default'`：

```javascript
// 设置用户ID
localStorage.setItem('user_id', 'your-user-id');

// 获取当前用户terms
const terms = await fetchCurrentUserTerms();
```

### API基础URL
在`src/requests/terms.js`中配置：

```javascript
const API_BASE_URL = 'http://43.142.250.179:8000';
```

## 国际化支持

新增的文案已添加到语言包中：

### 英文 (en.json)
```json
{
  "terms": {
    "fetchFailed": "Failed to fetch terms data",
    "loadFailed": "Failed to load terms"
  },
  "common": {
    "retry": "Retry"
  }
}
```

### 中文 (zh_CN.json)
```json
{
  "terms": {
    "fetchFailed": "获取术语数据失败",
    "loadFailed": "加载术语失败"
  },
  "common": {
    "retry": "重试"
  }
}
```

## 测试

### 浏览器测试
在浏览器控制台中运行：

```javascript
// 测试API调用
testTermsAPI();

// 手动设置用户ID并获取terms
localStorage.setItem('user_id', 'test-user');
const terms = await fetchCurrentUserTerms();
console.log(terms);
```

### 组件测试
1. 打开设置页面
2. 查看Terms卡片是否正确显示
3. 测试开关功能
4. 测试刷新功能
5. 测试错误状态显示

## 注意事项

1. **网络依赖**: 需要网络连接才能获取terms数据
2. **用户ID**: 确保正确设置用户ID以获得对应的terms数据
3. **错误处理**: 网络错误时会显示友好的错误提示和重试按钮
4. **性能**: 实现了防重复请求机制，避免不必要的API调用
5. **兼容性**: 保持了与现有UI组件的完全兼容

## 故障排除

### 常见问题

1. **API连接失败**
   - 检查网络连接
   - 验证API服务器状态
   - 确认API URL配置正确

2. **用户ID未设置**
   - 检查localStorage中的`user_id`
   - 确保用户ID格式正确

3. **数据格式错误**
   - 验证API返回的数据格式
   - 检查terms数组结构

4. **组件不显示**
   - 检查组件导入路径
   - 验证props传递
   - 查看浏览器控制台错误 