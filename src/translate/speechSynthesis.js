/**
 * Web Speech API (SpeechSynthesis) 封装
 * 逻辑等同于 J9：支持 lang/rate/volume、onStart/onFinish、AbortSignal 中断
 */

/**
 * 使用 SpeechSynthesis 朗读文本
 * @param {Object} options
 * @param {string} options.text - 要朗读的文本
 * @param {string} [options.lang='en-US'] - 语言代码
 * @param {number} [options.rate=0.9] - 语速
 * @param {number} [options.volume=1] - 音量 0–1
 * @param {AbortSignal} [options.signal] - 取消时 abort，会停止播放
 * @param {() => void} [options.onStart] - 开始播放时回调
 * @param {() => void} [options.onFinish] - 播放结束或出错时回调
 */
export function speak({ text, lang = "en-US", rate = 0.9, volume = 1, signal, onStart, onFinish }) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.volume = volume;

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onFinish?.();
  utterance.onerror = (event) => {
    console.error("WebSpeech Error:", event);
    onFinish?.();
  };

  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        synth.cancel();
      },
      { once: true }
    );
  }

  synth.cancel();
  synth.speak(utterance);
}
