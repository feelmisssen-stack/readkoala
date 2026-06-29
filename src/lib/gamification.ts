import type { ReflectionSection } from "./reflection-templates";
import type { Reflection, UserStats } from "./types";
import { hasMemorableSceneActivity } from "./image-moderation";

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
  beforeReadingPairs?: { ask: string; guess: string }[];
  duringReading: { question: string; answer: string }[];
  duringReadingPairs?: { ask: string; guess: string }[];
  association: string;
  favoriteQuote: string;
  reviewTitle: string;
  reviewReason: string;
  reviewContent: string;
  reviewImpressiveScene: string;
  reviewThoughts: string;
}): number {
  const beforePairs = reflection.beforeReadingPairs?.length
    ? reflection.beforeReadingPairs
    : reflection.beforeReading.map((q) => ({ ask: q.question, guess: q.answer }));

  const duringPairs = reflection.duringReadingPairs?.length
    ? reflection.duringReadingPairs
    : reflection.duringReading.map((q) => ({ ask: q.question, guess: q.answer }));

  const all = [
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
  return all.join("").length;
}

function hasReadingSectionContent(
  pairs: { ask: string; guess: string }[] | undefined,
  legacy: { question: string; answer: string }[]
): boolean {
  if (pairs?.some((p) => p.ask?.trim() || p.guess?.trim())) return true;
  return legacy.some((q) => q.answer?.trim());
}

function hasReviewContent(reflection: Reflection): boolean {
  return [
    reflection.reviewTitle,
    reflection.reviewReason,
    reflection.reviewContent,
    reflection.reviewImpressiveScene,
    reflection.reviewThoughts,
  ].some((v) => v?.trim());
}

export function hasReflectionSectionContent(
  reflection: Reflection | null | undefined,
  section: ReflectionSection
): boolean {
  if (!reflection) return false;

  switch (section) {
    case "before_reading":
      return hasReadingSectionContent(reflection.beforeReadingPairs, reflection.beforeReading);
    case "during_reading":
      return hasReadingSectionContent(reflection.duringReadingPairs, reflection.duringReading);
    case "association":
      return !!reflection.association?.trim();
    case "quote":
      return !!reflection.favoriteQuote?.trim();
    case "review":
      return hasReviewContent(reflection);
    case "memorable_scene":
      return hasMemorableSceneActivity(reflection);
    default:
      return false;
  }
}

/** 감상 기록량 0~5 (0이면 도장 숨김) */
export function getReflectionRecordLevel(reflection: Reflection | null | undefined): number {
  if (!reflection) return 0;

  const filledSections = [
    hasReadingSectionContent(reflection.beforeReadingPairs, reflection.beforeReading),
    hasReadingSectionContent(reflection.duringReadingPairs, reflection.duringReading),
    !!reflection.association?.trim(),
    !!reflection.favoriteQuote?.trim(),
    hasReviewContent(reflection),
    hasMemorableSceneActivity(reflection),
  ].filter(Boolean).length;

  if (filledSections === 0) return 0;
  return Math.min(5, filledSections);
}
