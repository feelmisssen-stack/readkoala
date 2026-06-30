const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export function getInitialConsonant(word: string): string {
  let result = "";
  for (const char of word.trim()) {
    const code = char.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) {
      result += CHO[Math.floor(code / 588)];
    } else {
      result += char;
    }
  }
  return result;
}
