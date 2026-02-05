// Content script
// console.log("Extension content script loaded");

// 划词翻译调试 - 选中文本监听
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  const text = selection?.toString()?.trim() || "";
  if (text) {
    console.log("[Penrose] 选中文本:", text);
  }
});

// 划词翻译调试 - 右键菜单监听
document.addEventListener("contextmenu", (e) => {
  const selection = window.getSelection();
  const text = selection?.toString()?.trim() || "";
  console.log("[Penrose] 右键点击, 当前选中:", text || "(无)");
}, true);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "lokalise") {
    // console.log("Lokalise action received");
    
  }
});
