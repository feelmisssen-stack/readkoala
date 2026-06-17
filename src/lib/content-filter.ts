const BANNED_WORDS = [
  "바보", "멍청", "죽어", "똥", "싫어해", "미친", "병신", "개새", "씨발", "좆",
  "지랄", "닥쳐", "꺼져", "쓰레기", "한심", "찌질",
];

export function containsInappropriateContent(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s/g, "");
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

export function validateContent(...texts: string[]): { ok: boolean; message?: string } {
  for (const text of texts) {
    if (text && containsInappropriateContent(text)) {
      return {
        ok: false,
        message: "초등학생에게 맞지 않는 표현이 있어요. 다른 말로 바꿔 주세요.",
      };
    }
  }
  return { ok: true };
}
