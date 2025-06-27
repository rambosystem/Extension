export function playAudio(word) {
  if (!word) return Promise.resolve();
  const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=2`;
  const audio = new Audio(audioUrl);
  return audio.play().catch((error) => {
    console.log(error);
    throw error; // 重新抛出错误，让调用层处理
  });
}
