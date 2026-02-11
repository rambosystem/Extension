// Content 脚本运行在浏览器环境，没有 process；在入口最先加载以 stub，避免 Vue 等依赖报错
if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: { NODE_ENV: "production" } };
}
