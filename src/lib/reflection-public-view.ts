import {
  loadBeforeReadingActivities,
  loadBeforeReadingPairs,
  loadDuringReadingActivities,
  loadDuringReadingPairs,
  type ReflectionSection,
} from "./reflection-templates";
import type { Reflection } from "./types";
import { isMemorableScenePublic } from "./image-moderation";

export interface PublicReadingQuestion {
  label: string;
  question: string;
}

export interface PublicStorySection {
  section: ReflectionSection;
  title: string;
  readingQuestions?: PublicReadingQuestion[];
  text?: string;
  imageUrl?: string;
  reviewFields?: { label: string; value: string }[];
}

function extractLegacyAsk(answer: string): string | null {
  const match = answer.match(/질문:\s*([^/]+)/);
  return match?.[1]?.trim() || null;
}

function getPublicReadingQuestions(
  loadActivities: typeof loadBeforeReadingActivities,
  loadPairs: typeof loadBeforeReadingPairs,
  reflection: Reflection,
  section: "before" | "during"
): PublicReadingQuestion[] {
  const legacy = section === "before" ? reflection.beforeReading : reflection.duringReading;
  const storedActivities =
    section === "before" ? reflection.beforeReadingActivities : reflection.duringReadingActivities;
  const storedPairs =
    section === "before" ? reflection.beforeReadingPairs : reflection.duringReadingPairs;

  const activities = loadActivities(storedActivities, legacy);
  const pairs = loadPairs(storedPairs, legacy);
  const items: PublicReadingQuestion[] = [];

  for (const activity of activities) {
    if (!activity.checked) continue;

    const pair = pairs.find((p) => p.activityKey === activity.key);
    const ask = pair?.ask?.trim();
    if (ask) {
      items.push({ label: activity.label, question: ask });
      continue;
    }

    const legacyEntry = legacy.find(
      (entry) => entry.question === activity.label || entry.question?.startsWith(activity.label)
    );
    const legacyAsk = legacyEntry?.answer?.trim() ? extractLegacyAsk(legacyEntry.answer) : null;
    if (legacyAsk) {
      items.push({ label: activity.label, question: legacyAsk });
      continue;
    }

    items.push({ label: activity.label, question: activity.label });
  }

  return items;
}

export function buildPublicStorySections(reflection: Reflection | null): PublicStorySection[] {
  if (!reflection) return [];

  const sections: PublicStorySection[] = [];

  const beforeQuestions = getPublicReadingQuestions(
    loadBeforeReadingActivities,
    loadBeforeReadingPairs,
    reflection,
    "before"
  );
  if (beforeQuestions.length > 0) {
    sections.push({
      section: "before_reading",
      title: "읽기 전",
      readingQuestions: beforeQuestions,
    });
  }

  const duringQuestions = getPublicReadingQuestions(
    loadDuringReadingActivities,
    loadDuringReadingPairs,
    reflection,
    "during"
  );
  if (duringQuestions.length > 0) {
    sections.push({
      section: "during_reading",
      title: "읽는 중",
      readingQuestions: duringQuestions,
    });
  }

  if (reflection.association?.trim()) {
    sections.push({
      section: "association",
      title: "이 책은 이럴때",
      text: reflection.association.trim(),
    });
  }

  if (reflection.favoriteQuote?.trim()) {
    sections.push({
      section: "quote",
      title: "책속 한마디",
      text: reflection.favoriteQuote.trim(),
    });
  }

  const reviewFields = [
    { label: "감상문 제목", value: reflection.reviewTitle },
    { label: "책을 읽은 까닭", value: reflection.reviewReason },
    { label: "책의 내용", value: reflection.reviewContent },
    { label: "인상 깊은 장면", value: reflection.reviewImpressiveScene },
    { label: "읽고 떠오른 생각이나 느낌", value: reflection.reviewThoughts },
  ].filter((field) => field.value?.trim());

  if (reviewFields.length > 0) {
    sections.push({
      section: "review",
      title: "감상문",
      reviewFields: reviewFields.map((field) => ({
        label: field.label,
        value: field.value.trim(),
      })),
    });
  }

  if (isMemorableScenePublic(reflection)) {
    sections.push({
      section: "memorable_scene",
      title: "기억에 남는 장면",
      imageUrl: reflection.memorableSceneImage!.trim(),
    });
  }

  return sections;
}
