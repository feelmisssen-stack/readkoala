export type EthicsValueBadge = {
  label: string;
  tone: "orange" | "green" | "blue";
};

export type EthicsHeadlinePart =
  | { type: "text"; text: string }
  | { type: "blank"; fieldId: string; answer: string };

export type EthicsGuideRow = {
  id: string;
  values: EthicsValueBadge[];
  guideNumber: string;
  guideName: string;
  headline: EthicsHeadlinePart[];
  body: string;
};

export const AI_ETHICS_GUIDE_ROWS: EthicsGuideRow[] = [
  {
    id: "guide-1",
    values: [
      { label: "주도성", tone: "orange" },
      { label: "합목적성", tone: "green" },
    ],
    guideNumber: "가이드 1",
    guideName: "활용 목적",
    headline: [
      { type: "text", text: "생성형 AI를 쓰기 전, ‘" },
      { type: "blank", fieldId: "why", answer: "왜" },
      { type: "text", text: "’ 쓰는지 말할 수 있어야 해요." },
    ],
    body: "생성형 AI를 사용하기 전에 ‘지금 내가 왜 쓰려고 하지?’라고 스스로 물어보세요. 생성형 AI는 내 생각을 대신해주는 게 아니라, 내 생각을 도와주는 도구임을 기억하세요. 모든 공부에 생성형 AI가 필요한 것은 아니므로, 지금 하는 활동에 생성형 AI를 사용하는 것이 나의 학습에 정말 도움이 될지 먼저 고민해요.",
  },
  {
    id: "guide-2",
    values: [{ label: "주도성", tone: "orange" }],
    guideNumber: "가이드 2",
    guideName: "주도적 학습",
    headline: [
      { type: "text", text: "생성형 AI에게 물어보기 전, 내 " },
      { type: "blank", fieldId: "think-1", answer: "생각" },
      { type: "text", text: "을 먼저 말해요." },
    ],
    body: "막막할 때 바로 생성형 AI에게 묻고 싶은 마음이 들 수 있지만, 먼저 스스로 시도해 보아야 나의 성장에 도움이 돼요. 주제에 대해 내가 아는 것과 내 아이디어를 먼저 공책에 적거나 정리한 뒤에 생성형 AI를 활용하세요.",
  },
  {
    id: "guide-3",
    values: [{ label: "주도성", tone: "orange" }],
    guideNumber: "가이드 3",
    guideName: "비판적 검증",
    headline: [
      { type: "text", text: "생성형 AI가 " },
      { type: "blank", fieldId: "can-be-wrong", answer: "틀릴 수 있다" },
      { type: "text", text: "는 점을 알아요." },
    ],
    body: "생성형 AI는 틀린 정보를 마치 사실인 것처럼 제시하기도 하므로, 알려준 내용은 항상 ‘정말 맞을까?’ 하고 한 번 더 확인하는 습관을 가져요. 중요한 내용일수록 책을 찾아보거나 선생님께 여쭤보는 등 다른 방법으로도 꼭 다시 확인하세요.",
  },
  {
    id: "guide-4",
    values: [
      { label: "주도성", tone: "orange" },
      { label: "합목적성", tone: "green" },
    ],
    guideNumber: "가이드 4",
    guideName: "사고의 확장",
    headline: [
      { type: "text", text: "생성형 AI와 함께 상상하며 내 " },
      { type: "blank", fieldId: "think-2", answer: "생각" },
      { type: "text", text: "을 더 크게 키워요." },
    ],
    body: "생성형 AI는 내가 생각하지 못했던 새로운 관점을 제시해 줄 수 있어요. AI가 제안한 내용을 그대로 베끼지 말고, 내 경험이나 느낌을 더해 나만의 결과물로 완성해 보세요.",
  },
  {
    id: "guide-5",
    values: [{ label: "안전성", tone: "blue" }],
    guideNumber: "가이드 5",
    guideName: "안전과 관계",
    headline: [
      { type: "text", text: "나의 정보와 " },
      { type: "blank", fieldId: "secret", answer: "비밀" },
      { type: "text", text: "을 말하지 않아요." },
    ],
    body: "이름, 주소, 학교처럼 나를 알 수 있는 정보는 AI에게 말하지 않아요. AI는 감정이 없으므로, 마음이 힘들 때는 친구, 부모님, 선생님께 이야기해요.",
  },
  {
    id: "guide-6",
    values: [{ label: "투명성", tone: "orange" }],
    guideNumber: "가이드 6",
    guideName: "투명성·윤리",
    headline: [
      {
        type: "text",
        text: "생성형 AI의 도움을 받았다면 숨기지 않고 정직하게 이야기해요.",
      },
    ],
    body: "어떤 부분이 AI의 도움을 받았는지 솔직하게 말하는 것이 중요해요. 정직하게 말할 때 내 노력이 더 빛나요.",
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

export function getEthicsBlankAnswersMap(rows = AI_ETHICS_GUIDE_ROWS) {
  const map: Record<string, string> = {};
  for (const row of rows) {
    for (const part of row.headline) {
      if (part.type === "blank") {
        map[part.fieldId] = part.answer;
      }
    }
  }
  return map;
}

export function shouldShowEthicsSpotCheck(firebaseUid: string, nextLoginNumber: number) {
  if (nextLoginNumber < 3) return false;

  let hash = 0;
  const seed = `${firebaseUid}:${nextLoginNumber}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return hash % 5 === 0;
}

export function getEthicsGateMode(nextLoginNumber: number, firebaseUid: string): EthicsGateMode | null {
  if (nextLoginNumber === 1) return "copy";
  if (nextLoginNumber === 2) return "simple";
  if (shouldShowEthicsSpotCheck(firebaseUid, nextLoginNumber)) return "simple";
  return null;
}
