/**
 * 豆包语音 TTS：单向流式 HTTP V3 合成并播放
 * https://www.volcengine.com/docs/6561/1598757
 *
 * 怎么用：
 * 1. 默认已使用控制台提供的 APP ID / Access Token，直接点翻译弹窗里的发音即可。
 * 2. 若想改用其他账号，可在扩展里执行：
 *    chrome.storage.local.set({ doubao_tts_app_id: '你的APP ID', doubao_tts_access_token: '你的Access Token' })
 */

const BYTEDANCE_TTS_V3 = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const X_API_RESOURCE_ID = "seed-tts-1.0";

/** 默认凭证（可与控制台一致）；优先使用 chrome.storage.local 中的 doubao_tts_app_id / doubao_tts_access_token */
const DEFAULT_APP_ID = "9475898476";
const DEFAULT_ACCESS_TOKEN = "pvrswIGZenbzLPfDB2jlDD4pAVf2CeNT";

/** 发音人（V3 为 speaker） */
const DEFAULT_VOICE_TYPE = "zh_male_jingqiangkanye_moon_bigtts";

function toPlaybackRate(rate = 1) {
  return Math.max(0.5, Math.min(2, Number(rate) || 1));
}

function hasExtensionContext() {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL;
}

/** 当前是否在扩展页（popup/options），若在普通网页的 content script 中则为 false */
function isExtensionPage() {
  if (typeof window === "undefined" || !chrome?.runtime?.getURL) return false;
  try {
    return window.location.origin === new URL(chrome.runtime.getURL("")).origin;
  } catch {
    return false;
  }
}

const STORAGE_KEYS = { APP_ID: "doubao_tts_app_id", ACCESS_TOKEN: "doubao_tts_access_token" };

/** 从 chrome.storage 读取豆包 TTS 凭证（可选），无则用默认值 */
async function getCredentials() {
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    const out = await new Promise((resolve) =>
      chrome.storage.local.get([STORAGE_KEYS.APP_ID, STORAGE_KEYS.ACCESS_TOKEN], resolve)
    );
    return {
      appId: out[STORAGE_KEYS.APP_ID] ?? DEFAULT_APP_ID,
      accessToken: out[STORAGE_KEYS.ACCESS_TOKEN] ?? DEFAULT_ACCESS_TOKEN,
    };
  }
  return { appId: DEFAULT_APP_ID, accessToken: DEFAULT_ACCESS_TOKEN };
}

/**
 * 通过 background 请求 TTS（避免 content script 下 CORS），返回 blob URL 或 null
 */
function fetchTtsViaBackground({ text, voiceType, speedRatio, encoding = "mp3" }) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return null;
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "DOUBAO_TTS_FETCH",
        payload: { text: text.trim(), voiceType, speedRatio, encoding },
      },
      (response) => {
        if (chrome.runtime.lastError || !response?.ok || !response.audioBase64) {
          resolve(null);
          return;
        }
        const bin = Uint8Array.from(atob(response.audioBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([bin], { type: `audio/${response.encoding || encoding}` });
        resolve(URL.createObjectURL(blob));
      }
    );
  });
}

/**
 * 请求豆包 TTS，返回可播放的 blob URL；无有效凭证时返回 null
 * 在 content script 环境下走 background 代理以绕过 CORS
 */
async function fetchTtsAudioUrl({
  text,
  appId,
  accessToken,
  voiceType,
  speedRatio,
  encoding = "mp3",
  signal,
}) {
  // 走 background 代理，避免 content script 下 CORS
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    const blobUrl = await fetchTtsViaBackground({
      text,
      voiceType,
      speedRatio,
      encoding,
    });
    return blobUrl;
  }

  const cred =
    appId != null && accessToken != null
      ? { appId: String(appId).trim(), accessToken: String(accessToken).trim() }
      : await getCredentials();
  const appIdVal = cred.appId || DEFAULT_APP_ID;
  const token = cred.accessToken || DEFAULT_ACCESS_TOKEN;
  if (!appIdVal || !token) return null;

  const speechRate = Math.max(-50, Math.min(100, Math.round((speedRatio - 1) * 100)));
  const body = {
    user: { uid: "penrose-tts" },
    req_params: {
      text: text.trim(),
      speaker: voiceType || DEFAULT_VOICE_TYPE,
      audio_params: { format: encoding, sample_rate: 24000 },
      speech_rate: speechRate,
    },
  };

  const res = await fetch(BYTEDANCE_TTS_V3, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-App-Id": appIdVal,
      "X-Api-Access-Key": token,
      "X-Api-Resource-Id": X_API_RESOURCE_ID,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS request failed: ${res.status} ${errText}`);
  }

  const chunks = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      try {
        const json = JSON.parse(s);
        if (json.code === 20000000) {
          streamDone = true;
          break;
        }
        if (json.data) chunks.push(json.data);
        if (json.code && json.code !== 0) throw new Error(json.message || `code ${json.code}`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("code")) throw e;
      }
    }
  }
  if (!streamDone && buffer.trim()) {
    try {
      const json = JSON.parse(buffer.trim());
      if (json.data) chunks.push(json.data);
    } catch (_) {}
  }
  const b64 = chunks.join("");
  if (!b64) throw new Error("TTS response has no audio data");
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bin], { type: `audio/${encoding}` });
  return URL.createObjectURL(blob);
}

function playViaExtensionIframe({
  url,
  volume,
  playbackRate,
  signal,
  onStart,
  onFinish,
  onFallback,
}) {
  const getUrl = chrome.runtime.getURL;
  const extensionOrigin = new URL(getUrl("")).origin;
  let iframe = null;
  let messageListener = null;
  let finished = false;

  function cleanup() {
    if (messageListener && typeof window !== "undefined") {
      window.removeEventListener("message", messageListener);
    }
    if (iframe?.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    iframe = null;
  }

  function done() {
    if (finished) return;
    finished = true;
    cleanup();
    onFinish?.();
  }

  if (signal?.aborted) return;
  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        if (iframe?.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ type: "stop" }, extensionOrigin);
          } catch (_) {}
        }
        done();
      },
      { once: true },
    );
  }

  messageListener = (event) => {
    if (event.origin !== extensionOrigin || !event.data?.type) return;
    if (event.data.type === "ended") {
      done();
    } else if (event.data.type === "error") {
      if (finished) return;
      finished = true;
      cleanup();
      onFallback?.();
    } else if (event.data.type === "stopped") {
      done();
    }
  };

  if (typeof window === "undefined") {
    onFallback?.();
    return;
  }
  window.addEventListener("message", messageListener);

  iframe = document.createElement("iframe");
  iframe.setAttribute("src", getUrl("audio-player.html"));
  iframe.setAttribute("hidden", "true");
  iframe.style.cssText =
    "position:absolute;width:0;height:0;border:0;clip:rect(0,0,0,0);";
  document.body.appendChild(iframe);

  iframe.addEventListener("load", () => {
    if (finished) return;
    try {
      iframe.contentWindow.postMessage(
        { type: "play", url, volume, playbackRate },
        extensionOrigin,
      );
      onStart?.();
    } catch (e) {
      if (!finished) {
        finished = true;
        cleanup();
        onFallback?.();
      }
    }
  });

  iframe.addEventListener("error", () => {
    if (!finished) {
      finished = true;
      cleanup();
      onFallback?.();
    }
  });
}

function playViaDirectAudio({
  url,
  volume,
  playbackRate,
  signal,
  onStart,
  onFinish,
  onFallback,
}) {
  let audio = null;
  let finished = false;

  function done() {
    if (finished) return;
    finished = true;
    if (audio) {
      audio.pause();
      audio.src = "";
      audio = null;
    }
    onFinish?.();
  }

  if (signal?.aborted) return;
  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = "";
        }
        done();
      },
      { once: true },
    );
  }

  audio = new Audio();
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.playbackRate = playbackRate;
  audio.oncanplaythrough = () => onStart?.();
  audio.onended = () => done();
  audio.onerror = () => {
    if (audio) audio.src = "";
    audio = null;
    if (!finished) {
      finished = true;
      onFallback?.();
    }
  };
  audio.src = url;
  audio.play().catch(() => {
    if (finished) return;
    finished = true;
    onFallback?.();
  });
}

/**
 * 使用豆包语音接口播放发音
 * @param {Object} options
 * @param {string} options.text - 要朗读的文本
 * @param {number} [options.rate=1] - 语速
 * @param {number} [options.volume=1] - 音量 0–1
 * @param {string} [options.voiceType] - 音色 voice_type
 * @param {string} [options.appId] - 豆包 TTS AppId（不传则用占位/配置）
 * @param {string} [options.accessToken] - 豆包 TTS AccessToken
 * @param {AbortSignal} [options.signal]
 * @param {() => void} [options.onStart]
 * @param {() => void} [options.onFinish]
 * @param {() => void} [options.onFallback] - 合成失败或未配置密钥时回调，可切到 WebSpeech
 */
export async function playWithDoubao({
  text,
  rate = 1,
  volume = 1,
  voiceType,
  appId,
  accessToken,
  signal,
  onStart,
  onFinish,
  onFallback,
}) {
  if (!text?.trim()) return;

  const playbackRate = toPlaybackRate(rate);
  let blobUrl = null;

  try {
    blobUrl = await fetchTtsAudioUrl({
      text: text.trim(),
      appId,
      accessToken,
      voiceType: voiceType || DEFAULT_VOICE_TYPE,
      speedRatio: playbackRate,
      signal,
    });
  } catch (e) {
    onFallback?.();
    return;
  }

  if (!blobUrl) {
    onFallback?.();
    return;
  }

  const payload = {
    url: blobUrl,
    volume,
    playbackRate,
    signal,
    onStart,
    onFinish: () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      onFinish?.();
    },
    onFallback: () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      onFallback?.();
    },
  };

  // 仅在扩展页使用 iframe；content script 下用直接 Audio 播放
  if (hasExtensionContext() && isExtensionPage()) {
    playViaExtensionIframe(payload);
  } else {
    playViaDirectAudio(payload);
  }
}
