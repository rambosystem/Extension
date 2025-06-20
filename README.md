# Vue3 + Element Plus Extension Scaffold

干净的 Vue3 + Element Plus 浏览器扩展脚手架

## 快速开始

```bash
# 安装依赖
npm install

# 构建项目 (必需)
npm run build

# 或者启动开发监听模式
npm run dev
```

## 加载扩展

1. 构建完成后，打开浏览器扩展页面 `edge://extensions/`
2. 开启"开发人员模式"
3. 点击"加载解压缩的扩展"
4. 选择项目根目录

## 开发流程

1. 运行 `npm run dev` 启动监听模式
2. 修改 `src/` 下的代码
3. 代码自动构建，在扩展管理页面刷新扩展即可

## 项目结构

```
├── src/
│   ├── App.vue      # 主组件 (popup)
│   ├── Options.vue  # 配置页面组件
│   ├── main.js      # popup入口文件
│   ├── options.js   # 配置页面入口文件
│   └── style.css    # 全局样式
├── dist/            # 构建输出 (构建后生成)
│   ├── popup.js     # 构建后的popup JS文件
│   ├── options.js   # 构建后的options JS文件
│   └── main.css     # 构建后的CSS文件
├── popup/
│   └── popup.html   # 弹出窗口 (引用dist文件)
├── options/
│   └── options.html # 配置页面 (引用dist文件)
├── content.js       # 内容脚本
└── manifest.json    # 扩展配置
```

## 功能

- **Popup 界面**: 点击扩展图标打开
- **配置页面**: 在扩展管理页面点击"扩展程序选项"或 popup 中的"打开设置"按钮
- **Content Script**: 注入到所有网页
