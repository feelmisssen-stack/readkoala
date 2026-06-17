import type { UserStats } from "./types";

export function calculateLevel(stats: UserStats): number {
  const score =
    stats.booksRead * 50 +
    Math.floor(stats.totalChars / 100) +
    stats.chatParticipations * 30;
  return Math.min(10, Math.floor(score / 100) + 1);
}

export function getKoalaStage(level: number): {
  emoji: string;
  title: string;
  description: string;
  decorations: string[];
} {
  if (level >= 10)
    return {
      emoji: "🐨✨",
      title: "독서 마스터 코알라",
      description: "책과 함께 자란 멋진 독서가!",
      decorations: ["📚", "🌟", "🌳", "🎓", "🏆"],
    };
  if (level >= 7)
    return {
      emoji: "🐨📖",
      title: "책벌레 코알라",
      description: "많은 책을 읽고 글도 잘 쓰는 코알라!",
      decorations: ["📚", "🌟", "🌳", "✏️"],
    };
  if (level >= 4)
    return {
      emoji: "🐨🌿",
      title: "성장하는 코알라",
      description: "독서 기록이 쌓이면서 자라고 있어요!",
      decorations: ["📖", "🍃", "⭐"],
    };
  if (level >= 2)
    return {
      emoji: "🐨",
      title: "꼬마 독서가",
      description: "첫 책을 읽기 시작한 용감한 코알라!",
      decorations: ["📕", "🌱"],
    };
  return {
    emoji: "🐨💤",
    title: "잠꼬대 코알라",
    description: "책을 읽으면 코알라가 깨어나요!",
    decorations: ["💤"],
  };
}

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
