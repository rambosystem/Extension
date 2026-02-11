// 划词翻译 - 右键菜单
const TRANSLATE_MENU_ID = "penrose-translate-selection";

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.contextMenus.remove(TRANSLATE_MENU_ID);
  } catch (_) {
    // 不存在则忽略
  }
  chrome.contextMenus.create(
    {
      id: TRANSLATE_MENU_ID,
      title: "Translate",
      contexts: ["selection"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("[Penrose] contextMenus.create:", chrome.runtime.lastError.message);
      }
    }
  );
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === TRANSLATE_MENU_ID && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: "showTranslatePopup",
      selectionText: info.selectionText,
    }).catch((err) => {
      console.error("[Penrose] sendMessage to content:", err.message);
    });
  }
});
