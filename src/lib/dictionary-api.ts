const FALLBACK_DICT: Record<string, string> = {
  감상: "사물이나 현상을 보고 느끼거나 생각함.",
  독서: "책을 읽음.",
  상상: "머릿속으로 그림을 그리거나 생각함.",
  인상: "마음에 남는 느낌.",
  느낌: "마음으로 받아들이는 기분.",
  표지: "책의 겉면.",
  차례: "책에서 내용이 나오는 순서.",
  문장: "생각을 말이나 글로 나타낸 것.",
  단어: "뜻을 가진 말.",
  이야기: "어떤 일이나 사건을 말이나 글로 전함.",
  주인공: "이야기의 가장 중심이 되는 사람이나 동물.",
  배경: "이야기가 일어나는 시간이나 장소.",
  교훈: "배워야 할 가르침.",
  용기: "어려운 일을내려는 마음.",
  우정: "친구 사이의 정.",
  꿈: "잠잘 때 보는 것이나 이루고 싶은 것.",
  모험: "새롭고 신나는 일을 겪음.",
  비밀: "남에게 알리지 않고 숨기는 것.",
  발견: "처음 알게 되거나 찾아냄.",
  성장: "점점 자라거나 발전함.",
};

export interface DictResult {
  word: string;
  definition: string;
  source: "api" | "fallback";
}

export async function lookupWord(word: string): Promise<DictResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  const apiKey = process.env.KOREAN_DICT_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://opendict.korean.go.kr/api/search?key=${apiKey}&q=${encodeURIComponent(trimmed)}&req_type=json&part=word&sort=dict&start=1&num=1`,
        { next: { revalidate: 86400 } }
      );
      const data = await res.json();
      const item = data.channel?.item?.[0];
      if (item?.sense?.definition) {
        return {
          word: trimmed,
          definition: item.sense.definition.replace(/<[^>]+>/g, ""),
          source: "api",
        };
      }
    } catch {
      /* fallback */
    }
  }

  if (FALLBACK_DICT[trimmed]) {
    return { word: trimmed, definition: FALLBACK_DICT[trimmed], source: "fallback" };
  }

  for (const [key, def] of Object.entries(FALLBACK_DICT)) {
    if (key.includes(trimmed) || trimmed.includes(key)) {
      return { word: key, definition: def, source: "fallback" };
    }
  }

  return {
    word: trimmed,
    definition: `"${trimmed}"의 뜻을 사전에서 찾지 못했어요. 선생님께 물어보거나 우리말샘 API 키를 설정해 보세요.`,
    source: "fallback",
  };
}

export function getInitialConsonant(word: string): string {
  const cho = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
  ];
  const code = word.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return word.charAt(0);
  return cho[Math.floor(code / 588)];
}
