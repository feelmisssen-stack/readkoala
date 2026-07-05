import type { Database, Reflection } from "./types";

export const BYTES_PER_LEAF = 10;
export const LEAVES_PER_STAGE = 100;
export const STAGE_COUNT = 10;

export const KOALA_STAGES = [
  {
    level: 1,
    name: "쿨쿨 아기 코알라",
    description: "아직 책을 읽지 않아 코알라가 졸린가 봐요.\n책을 읽고 코알라를 깨워주세요!",
  },
  {
    level: 2,
    name: "호기심 쫑긋 코알라",
    description: "앗, 코알라가 책 이야기에 관심을 보이기 시작했어요!",
  },
  {
    level: 3,
    name: "새싹 꼬마 독자 코알라",
    description: "내 힘으로 책을 읽기 시작한 멋진 꼬마 독자가 되었어요.",
  },
  {
    level: 4,
    name: "도란도란 책수다 코알라",
    description: "내가 읽은 책 이야기를 친구들과 나누고 싶어 입이 근질근질해요.",
  },
  {
    level: 5,
    name: "초록잎 꼬마 사서 코알라",
    description: "이제 제법 책을 잘 읽는걸요?\n도란서재의 정식 꼬마 사서로 임명합니다!",
  },
  {
    level: 6,
    name: "돋보기 지혜 탐험가 코알라",
    description: "단순히 읽는 것을 넘어, 책 속의 보물 같은 지혜를 탐험하고 있어요.",
  },
  {
    level: 7,
    name: "듬직한 서재 지기 코알라",
    description: "도란서재의 책이라면 모르는 게 없는 든든한 서재 지기예요.",
  },
  {
    level: 8,
    name: "이야기 숲 마법사 코알라",
    description: "나만의 생각으로 새로운 이야기를 만들어내는 마법 같은 글솜씨를 가졌어요.",
  },
  {
    level: 9,
    name: "반짝반짝 별빛 현자 코알라",
    description: "숲속 동물들이 고민이 생기면 찾아와 지혜를 물어보는 똑똑한 현자가 되었어요.",
  },
  {
    level: 10,
    name: "도란서재 명예 관장 코알라",
    description: "최고의 영예!\n꾸준한 독서로 도란서재를 빛낸 가장 위대한 코알라입니다.",
  },
] as const;

/** 플랫 2D 일러스트 — public/images/koala-stages/koala-lv1~10.png */
export const KOALA_STAGE_IMAGES = [
  "/images/koala-stages/koala-lv1.png",
  "/images/koala-stages/koala-lv2.png",
  "/images/koala-stages/koala-lv3.png",
  "/images/koala-stages/koala-lv4.png",
  "/images/koala-stages/koala-lv5.png",
  "/images/koala-stages/koala-lv6.png",
  "/images/koala-stages/koala-lv7.png",
  "/images/koala-stages/koala-lv8.png",
  "/images/koala-stages/koala-lv9.png",
  "/images/koala-stages/koala-lv10.png",
] as const;

/** 이미지 교체 시 숫자를 올리면 브라우저·Next 캐시를 갱신합니다 */
export const KOALA_STAGE_IMAGE_VERSION = "5";

export function getKoalaStageImage(stageIndex: number): string {
  const index = Math.max(0, Math.min(stageIndex, KOALA_STAGE_IMAGES.length - 1));
  return `${KOALA_STAGE_IMAGES[index]}?v=${KOALA_STAGE_IMAGE_VERSION}`;
}

export function splitStageDescription(description: string): string[] {
  return description.split("\n");
}

export function countTextBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function countReflectionBytes(reflection: Reflection): number {
  const beforePairs = reflection.beforeReadingPairs?.length
    ? reflection.beforeReadingPairs
    : reflection.beforeReading.map((q) => ({ ask: q.question, guess: q.answer }));

  const duringPairs = reflection.duringReadingPairs?.length
    ? reflection.duringReadingPairs
    : reflection.duringReading.map((q) => ({ ask: q.question, guess: q.answer }));

  const parts = [
    ...beforePairs.flatMap((p) => [p.ask, p.guess]),
    ...duringPairs.flatMap((p) => [p.ask, p.guess]),
    reflection.association,
    reflection.favoriteQuote,
    reflection.reviewTitle,
    reflection.reviewReason,
    reflection.reviewContent,
    reflection.reviewImpressiveScene,
    reflection.reviewThoughts,
  ];

  return countTextBytes(parts.join(""));
}

export function getUserWritingByteTotal(db: Database, userId: string): number {
  let total = 0;

  for (const reflection of db.reflections.filter((entry) => entry.userId === userId)) {
    total += countReflectionBytes(reflection);
  }

  for (const sentence of db.sharedSentences.filter((entry) => entry.userId === userId)) {
    total += countTextBytes(sentence.sentence);
  }

  return total;
}

export interface WritingGrowth {
  totalBytes: number;
  leafCount: number;
  stageIndex: number;
  stageCount: number;
  stageLevel: number;
  stageName: string;
  stageDescription: string;
  progressLeaves: number;
  leavesPerStage: number;
  bytesPerLeaf: number;
  visualTier: number;
}

export function getGrowthStage(stageIndex: number) {
  const index = Math.max(0, Math.min(stageIndex, KOALA_STAGES.length - 1));
  return KOALA_STAGES[index];
}

export function getWritingGrowth(totalBytes: number): WritingGrowth {
  const leafCount = Math.floor(totalBytes / BYTES_PER_LEAF);
  const stageIndex = Math.min(Math.floor(leafCount / LEAVES_PER_STAGE), STAGE_COUNT - 1);
  const progressLeaves = leafCount % LEAVES_PER_STAGE;
  const atMaxStage = stageIndex >= STAGE_COUNT - 1;
  const stage = getGrowthStage(stageIndex);

  return {
    totalBytes,
    leafCount,
    stageIndex,
    stageCount: STAGE_COUNT,
    stageLevel: stage.level,
    stageName: stage.name,
    stageDescription: stage.description,
    progressLeaves: atMaxStage ? LEAVES_PER_STAGE : progressLeaves,
    leavesPerStage: LEAVES_PER_STAGE,
    bytesPerLeaf: BYTES_PER_LEAF,
    visualTier: stageIndex,
  };
}

export function getUserWritingGrowth(db: Database, userId: string): WritingGrowth {
  return getWritingGrowth(getUserWritingByteTotal(db, userId));
}

export function getUserWritingGrowthFromEntries(
  reflections: Reflection[],
  sharedSentences: Database["sharedSentences"],
  userId: string
): WritingGrowth {
  let total = 0;

  for (const reflection of reflections.filter((entry) => entry.userId === userId)) {
    total += countReflectionBytes(reflection);
  }

  for (const sentence of sharedSentences.filter((entry) => entry.userId === userId)) {
    total += countTextBytes(sentence.sentence);
  }

  return getWritingGrowth(total);
}
