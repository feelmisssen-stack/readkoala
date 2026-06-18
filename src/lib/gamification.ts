import type { UserStats } from "./types";

export function calculateLevel(stats: UserStats): number {
  const score =
    stats.booksRead * 50 +
    Math.floor(stats.totalChars / 100) +
    stats.chatParticipations * 30;
  return Math.min(10, Math.floor(score / 100) + 1);
}

export function getReadingStage(level: number): {
  title: string;
  description: string;
} {
  if (level >= 10)
    return {
      title: "독서 마스터",
      description: "책과 함께 자란 멋진 독서가!",
    };
  if (level >= 7)
    return {
      title: "책벌레",
      description: "많은 책을 읽고 글도 잘 쓰고 있어요!",
    };
  if (level >= 4)
    return {
      title: "성장하는 독서가",
      description: "독서 기록이 쌓이면서 깊어지고 있어요!",
    };
  if (level >= 2)
    return {
      title: "꼬마 독서가",
      description: "첫 책을 읽기 시작했어요!",
    };
  return {
    title: "첫 발자국",
    description: "책을 읽고 기록을 남겨 보세요.",
  };
}

/** @deprecated Use getReadingStage */
export const getKoalaStage = getReadingStage;

export function countReflectionChars(reflection: {
  beforeReading: { question: string; answer: string }[];
  duringReading: { question: string; answer: string }[];
  association: string;
  favoriteQuote: string;
  reviewTitle: string;
  reviewReason: string;
  reviewContent: string;
  reviewImpressiveScene: string;
  reviewThoughts: string;
}): number {
  const all = [
    ...reflection.beforeReading.flatMap((q) => [q.question, q.answer]),
    ...reflection.duringReading.flatMap((q) => [q.question, q.answer]),
    reflection.association,
    reflection.favoriteQuote,
    reflection.reviewTitle,
    reflection.reviewReason,
    reflection.reviewContent,
    reflection.reviewImpressiveScene,
    reflection.reviewThoughts,
  ];
  return all.join("").length;
}
