// Penrose 扩展 Service Worker
import {
  TTS_API_URL,
  X_API_RESOURCE_ID,
  DEFAULT_APP_ID,
  DEFAULT_ACCESS_TOKEN,
  DEFAULT_VOICE_TYPE,
  STORAGE_KEYS as TTS_STORAGE_KEYS,
} from "@/translate/config/tts.js";
import { readV3Stream, toSpeechRate } from "@/translate/ttsStreamParser.js";

// 划词翻译 - 右键菜单
const TRANSLATE_MENU_ID = "penrose-translate-selection";
const WORD_SELECTION_TRANSLATE_ENABLED = "word_selection_translate_enabled";
const TRANSLATE_MENU_INDEX = "2";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_TRANSLATE_SETTINGS") {
    chrome.storage.local.set({ initialMenu: "2", currentMenu: "2" }, () => {
      chrome.runtime.openOptionsPage(() => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }
  // Setting 路由单独配置：打开选项页并定位到指定菜单（menu 为 Options 侧边栏 index，如 "2"=Translate "3"=Settings）
  if (msg.type === "OPEN_OPTIONS" && msg.menu) {
    const menu = String(msg.menu);
    chrome.storage.local.set({ initialMenu: menu, currentMenu: menu }, () => {
      chrome.runtime.openOptionsPage(() => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }
  if (msg.type !== "DOUBAO_TTS_FETCH") return false;
  (async () => {
    try {
      const out = await chrome.storage.local.get([
        TTS_STORAGE_KEYS.APP_ID,
        TTS_STORAGE_KEYS.ACCESS_TOKEN,
        TTS_STORAGE_KEYS.VOICE_TYPE,
      ]);
      const appId = out[TTS_STORAGE_KEYS.APP_ID]?.trim() || DEFAULT_APP_ID;
      const token =
        out[TTS_STORAGE_KEYS.ACCESS_TOKEN]?.trim() || DEFAULT_ACCESS_TOKEN;
      if (!appId || !token) return { ok: false, error: "missing credentials" };
      const payload = msg.payload || {};
      const voiceType =
        payload.voiceType?.trim() ||
        out[TTS_STORAGE_KEYS.VOICE_TYPE]?.trim() ||
        DEFAULT_VOICE_TYPE;
      const { text, speedRatio, encoding = "mp3" } = payload;
      if (!text?.trim()) {
        return { ok: false, error: "missing text" };
      }
      const body = {
        user: { uid: "penrose-tts" },
        req_params: {
          text: text.trim(),
          speaker: voiceType,
          audio_params: {
            format: encoding,
            sample_rate: 24000,
          },
          speech_rate: toSpeechRate(speedRatio ?? 1),
        },
      };
      const res = await fetch(TTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-App-Id": appId,
          "X-Api-Access-Key": token,
          "X-Api-Resource-Id": X_API_RESOURCE_ID,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `TTS ${res.status}: ${errText}` };
      }
      return await readV3Stream(res, encoding);
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  })().then(sendResponse);
  return true;
});

function createTranslateContextMenu() {
  chrome.contextMenus.create(
    {
      id: TRANSLATE_MENU_ID,
      title: "Translate",
      contexts: ["selection"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "[Penrose] contextMenus.create:",
          chrome.runtime.lastError.message,
        );
      }
    },
  );
}

function removeTranslateContextMenu() {
  return chrome.contextMenus.remove(TRANSLATE_MENU_ID).catch(() => {});
}

function updateTranslateMenuVisibility(enabled) {
  removeTranslateContextMenu().then(() => {
    if (enabled) createTranslateContextMenu();
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const prefs = await chrome.storage.local.get([WORD_SELECTION_TRANSLATE_ENABLED]);
  const enabled = prefs[WORD_SELECTION_TRANSLATE_ENABLED] === "true";
  if (enabled) createTranslateContextMenu();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[WORD_SELECTION_TRANSLATE_ENABLED]) return;
  const newVal = changes[WORD_SELECTION_TRANSLATE_ENABLED].newValue;
  updateTranslateMenuVisibility(newVal === "true");
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === TRANSLATE_MENU_ID && info.selectionText) {
    chrome.tabs
      .sendMessage(tab.id, {
        action: "showTranslatePopup",
        selectionText: info.selectionText,
      })
      .catch((err) => {
        console.error("[Penrose] sendMessage to content:", err.message);
      });
  }
});

function openTranslatePopupFromActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs?.[0]?.id;
    if (!activeTabId) return;
    chrome.tabs
      .sendMessage(activeTabId, { action: "showTranslatePopup" })
      .catch(() => {
        chrome.storage.local.set(
          {
            initialMenu: TRANSLATE_MENU_INDEX,
            currentMenu: TRANSLATE_MENU_INDEX,
          },
          () => {
            chrome.runtime.openOptionsPage();
          },
        );
      });
  });
}

chrome.commands?.onCommand.addListener((command) => {
  if (command === "open-translate-popup") {
    openTranslatePopupFromActiveTab();
  }
});
