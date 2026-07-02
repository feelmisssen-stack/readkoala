export type EthicsHeadlinePart =
  | { type: "text"; text: string }
  | { type: "blank"; fieldId: string; answer: string };

export type EthicsHeadline = {
  id: string;
  headline: EthicsHeadlinePart[];
};

/** 감상문 도우미 시작 전 안내 — 핵심 문장 5개만 */
export const AI_ETHICS_HEADLINES: EthicsHeadline[] = [
  {
    id: "guide-1",
    headline: [
      { type: "text", text: "AI챗봇을 쓰기 전, ‘" },
      { type: "blank", fieldId: "why", answer: "왜" },
      { type: "text", text: "’ 쓰는지 말할 수 있어야 해요." },
    ],
  },
  {
    id: "guide-2",
    headline: [
      { type: "text", text: "AI챗봇에게 물어보기 전, 내 " },
      { type: "blank", fieldId: "think-1", answer: "생각" },
      { type: "text", text: "을 먼저 말해요." },
    ],
  },
  {
    id: "guide-3",
    headline: [
      { type: "text", text: "AI챗봇이 " },
      { type: "blank", fieldId: "can-be-wrong", answer: "틀릴 수 있다" },
      { type: "text", text: "는 점을 알아요." },
    ],
  },
  {
    id: "guide-4",
    headline: [
      { type: "text", text: "AI챗봇과 함께 상상하며 내 " },
      { type: "blank", fieldId: "think-2", answer: "생각" },
      { type: "text", text: "을 더 크게 키워요." },
    ],
  },
  {
    id: "guide-5",
    headline: [
      { type: "text", text: "나의 정보와 " },
      { type: "blank", fieldId: "secret", answer: "비밀" },
      { type: "text", text: "을 말하지 않아요." },
    ],
  },
];

export const AI_ETHICS_COPY_FIELD_IDS = ["why", "think-1", "can-be-wrong", "think-2", "secret"] as const;

export type EthicsGateMode = "copy" | "simple";

export function normalizeEthicsInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isEthicsCopyAnswerCorrect(input: string, answer: string) {
  return normalizeEthicsInput(input) === normalizeEthicsInput(answer);
}

export function getEthicsBlankAnswersMap(headlines = AI_ETHICS_HEADLINES) {
  const map: Record<string, string> = {};
  for (const row of headlines) {
    for (const part of row.headline) {
      if (part.type === "blank") {
        map[part.fieldId] = part.answer;
      }
    }
  }
  return map;
}

export function shouldShowEthicsSpotCheck(firebaseUid: string, nextUseNumber: number) {
  if (nextUseNumber < 3) return false;

  let hash = 0;
  const seed = `${firebaseUid}:${nextUseNumber}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return hash % 5 === 0;
}

export function getEthicsGateMode(nextUseNumber: number, firebaseUid: string): EthicsGateMode | null {
  if (nextUseNumber === 1) return "copy";
  if (nextUseNumber === 2) return "simple";
  if (shouldShowEthicsSpotCheck(firebaseUid, nextUseNumber)) return "simple";
  return null;
}
