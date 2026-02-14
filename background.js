// 划词翻译 - 右键菜单
const TRANSLATE_MENU_ID = "penrose-translate-selection";

// 豆包 TTS：在 background 中请求，避免 content script 的 CORS
const BYTEDANCE_TTS_BASE = "https://openspeech.bytedance.com/api/v1/tts";
const DEFAULT_APP_ID = "9475898476";
const DEFAULT_ACCESS_TOKEN = "pvrswIGZenbzLPfDB2jlDD4pAVf2CeNT";
const STORAGE_APP_ID = "doubao_tts_app_id";
const STORAGE_ACCESS_TOKEN = "doubao_tts_access_token";
const DEFAULT_CLUSTER = "volcano_tts";
const DEFAULT_VOICE_TYPE = "BV700_V2_streaming";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "DOUBAO_TTS_FETCH") return false;
  // 返回 Promise，避免 MV3 下异步 sendResponse 无法送达
  (async () => {
    try {
      const out = await chrome.storage.local.get([STORAGE_APP_ID, STORAGE_ACCESS_TOKEN]);
      const appid = out[STORAGE_APP_ID]?.trim() || DEFAULT_APP_ID;
      const token = out[STORAGE_ACCESS_TOKEN]?.trim() || DEFAULT_ACCESS_TOKEN;
      if (!appid || !token) {
        console.warn("[Penrose TTS] background: 缺少凭证");
        return { ok: false, error: "missing credentials" };
      }
      const { text, voiceType, speedRatio, encoding = "mp3" } = msg.payload || {};
      if (!text?.trim()) {
        return { ok: false, error: "missing text" };
      }
      const reqid = `penrose-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const body = {
        app: { appid, token, cluster: DEFAULT_CLUSTER },
        user: { uid: "penrose-tts" },
        audio: {
          voice_type: voiceType || DEFAULT_VOICE_TYPE,
          encoding,
          rate: 24000,
          speed_ratio: speedRatio ?? 1,
          volume_ratio: 1,
          pitch_ratio: 1,
        },
        request: {
          reqid,
          text: text.trim(),
          text_type: "plain",
          operation: "query",
        },
      };
      const res = await fetch(BYTEDANCE_TTS_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer;${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Penrose TTS] background: API 错误", res.status, errText);
        if (res.status === 401) {
          console.warn("[Penrose TTS] 鉴权失败：请到豆包/火山控制台确认 APP ID 与 Access Token 正确且未过期，必要时重新复制 Token。");
        }
        return { ok: false, error: `TTS ${res.status}: ${errText}` };
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        const b64 = json.data ?? json.audio_data ?? json.audio;
        if (b64) {
          console.log("[Penrose TTS] background: 豆包返回音频成功, 长度", b64.length);
          return { ok: true, audioBase64: b64, encoding };
        }
        console.warn("[Penrose TTS] background: 响应 JSON 中无音频字段", Object.keys(json));
        return { ok: false, error: "no audio in response" };
      }
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      console.log("[Penrose TTS] background: 豆包返回二进制音频成功");
      return { ok: true, audioBase64: btoa(binary), encoding };
    } catch (e) {
      console.warn("[Penrose TTS] background: 异常", e?.message || e);
      return { ok: false, error: e?.message || String(e) };
    }
  })().then(sendResponse);
  return true;
});

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
