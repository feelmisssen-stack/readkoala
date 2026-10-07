import {
  loadBeforeReadingActivities,
  loadBeforeReadingPairs,
  loadDuringReadingActivities,
  loadDuringReadingPairs,
} from "./reflection-templates";
import type { Reflection } from "./types";

export interface AdminReadingPair {
  label?: string;
  ask: string;
  guess: string;
}

export interface AdminReflectionSection {
  title: string;
  pairs?: AdminReadingPair[];
  text?: string;
  fields?: { label: string; value: string }[];
  imageUrl?: string;
}

function buildReadingPairs(
  reflection: Reflection,
  section: "before" | "during"
): AdminReadingPair[] {
  const legacy = section === "before" ? reflection.beforeReading : reflection.duringReading;
  const activities =
    section === "before"
      ? loadBeforeReadingActivities(reflection.beforeReadingActivities, legacy)
      : loadDuringReadingActivities(reflection.duringReadingActivities, legacy);
  const pairs =
    section === "before"
      ? loadBeforeReadingPairs(reflection.beforeReadingPairs, legacy)
      : loadDuringReadingPairs(reflection.duringReadingPairs, legacy);

  return pairs
    .map((pair) => ({
      label: activities.find((activity) => activity.key === pair.activityKey)?.label,
      ask: pair.ask?.trim() ?? "",
      guess: pair.guess?.trim() ?? "",
    }))
    .filter((pair) => pair.ask || pair.guess);
}

/** 관리자용: 공개 화면(buildPublicStorySections)과 달리 짐작하기 답까지 포함한다 */
export function buildAdminReflectionSections(
  reflection: Reflection | null | undefined
): AdminReflectionSection[] {
  if (!reflection) return [];

  const sections: AdminReflectionSection[] = [];

  const before = buildReadingPairs(reflection, "before");
  if (before.length > 0) sections.push({ title: "읽기 전", pairs: before });

  const during = buildReadingPairs(reflection, "during");
  if (during.length > 0) sections.push({ title: "읽는 중", pairs: during });

  if (reflection.association?.trim()) {
    sections.push({ title: "이 책은 이럴때", text: reflection.association.trim() });
  }

  if (reflection.favoriteQuote?.trim()) {
    sections.push({ title: "책속 한마디", text: reflection.favoriteQuote.trim() });
  }

  const reviewFields = [
    { label: "감상문 제목", value: reflection.reviewTitle },
    { label: "책을 읽은 까닭", value: reflection.reviewReason },
    { label: "책의 내용", value: reflection.reviewContent },
    { label: "인상 깊은 장면", value: reflection.reviewImpressiveScene },
    { label: "읽고 떠오른 생각이나 느낌", value: reflection.reviewThoughts },
  ]
    .filter((field) => field.value?.trim())
    .map((field) => ({ label: field.label, value: field.value.trim() }));
  if (reviewFields.length > 0) sections.push({ title: "감상문", fields: reviewFields });

  if (reflection.memorableSceneImage?.trim()) {
    sections.push({ title: "기억에 남는 장면", imageUrl: reflection.memorableSceneImage.trim() });
  }

  return sections;
}
