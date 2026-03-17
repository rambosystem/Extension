// 划词翻译 - 右键菜单
const TRANSLATE_MENU_ID = "penrose-translate-selection";
const WORD_SELECTION_TRANSLATE_ENABLED = "word_selection_translate_enabled";
const TRANSLATE_MENU_INDEX = "2";
const CLIPBOARD_MENU_INDEX = "3";

// 豆包 TTS 配置（主配置见 src/translate/config/tts.js，此处为 background 用副本，修改配置请同步两处）
const TTS_API_URL =
  "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const TTS_DEFAULT_APP_ID = "9475898476";
const TTS_DEFAULT_ACCESS_TOKEN = "pvrswIGZenbzLPfDB2jlDD4pAVf2CeNT";
const TTS_STORAGE_APP_ID = "doubao_tts_app_id";
const TTS_STORAGE_ACCESS_TOKEN = "doubao_tts_access_token";
const TTS_DEFAULT_VOICE_TYPE = "en_male_glen_emo_v2_mars_bigtts";
const TTS_X_API_RESOURCE_ID = "seed-tts-1.0";

/** 语速：V3 speech_rate [-50,100]，0=1x；speedRatio 0.5~2 映射过去 */
function toSpeechRate(speedRatio) {
  const r = Number(speedRatio) || 1;
  return Math.max(-50, Math.min(100, Math.round((r - 1) * 100)));
}

/** 从单条 JSON 中取 base64 音频（兼容 data / audio 等字段） */
function getB64FromJson(json) {
  const raw = json.data ?? json.audio ?? json.audio_data;
  if (typeof raw === "string") return raw;
  return null;
}

/** 解析 V3 流式响应：整段读取后按行解析 NDJSON，或单条 JSON */
async function readV3Stream(res, encoding) {
  const text = await res.text();
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  for (const line of lines) {
    try {
      const json = JSON.parse(line);
      if (json.code === 20000000) {
        const b64 = chunks.join("");
        return b64
          ? { ok: true, audioBase64: b64, encoding }
          : { ok: false, error: "no audio in stream" };
      }
      if (json.code != null && json.code !== 0 && json.code !== 20000000) {
        return { ok: false, error: json.message || `code ${json.code}` };
      }
      const b64 = getB64FromJson(json);
      if (b64) chunks.push(b64);
    } catch (_) {}
  }
  const b64 = chunks.join("");
  if (b64) return { ok: true, audioBase64: b64, encoding };
  try {
    const single = JSON.parse(text.trim());
    const one = getB64FromJson(single);
    if (one) return { ok: true, audioBase64: one, encoding };
    if (single.code && single.code !== 0)
      return { ok: false, error: single.message || `code ${single.code}` };
  } catch (_) {}
  return { ok: false, error: "no audio in stream" };
}

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
      const TTS_STORAGE_VOICE_TYPE = "doubao_tts_voice_type";
      const out = await chrome.storage.local.get([
        TTS_STORAGE_APP_ID,
        TTS_STORAGE_ACCESS_TOKEN,
        TTS_STORAGE_VOICE_TYPE,
      ]);
      const appId = out[TTS_STORAGE_APP_ID]?.trim() || TTS_DEFAULT_APP_ID;
      const token =
        out[TTS_STORAGE_ACCESS_TOKEN]?.trim() || TTS_DEFAULT_ACCESS_TOKEN;
      if (!appId || !token) return { ok: false, error: "missing credentials" };
      const payload = msg.payload || {};
      const voiceType =
        payload.voiceType?.trim() ||
        out[TTS_STORAGE_VOICE_TYPE]?.trim() ||
        TTS_DEFAULT_VOICE_TYPE;
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
          "X-Api-Resource-Id": TTS_X_API_RESOURCE_ID,
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

function openFavoritesPopupFromActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs?.[0]?.id;
    if (!activeTabId) return;
    chrome.tabs
      .sendMessage(activeTabId, { action: "showFavoritesPopup" })
      .catch(() => {
        chrome.storage.local.set(
          {
            initialMenu: CLIPBOARD_MENU_INDEX,
            currentMenu: CLIPBOARD_MENU_INDEX,
          },
          () => {
            chrome.runtime.openOptionsPage();
          },
        );
      });
  });
}

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
    return;
  }
  if (command === "open-clipboard-popup") {
    openFavoritesPopupFromActiveTab();
  }
});
