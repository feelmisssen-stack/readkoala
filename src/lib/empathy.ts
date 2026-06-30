import type { StoryEmpathy } from "@/lib/types";

export const MAX_HEART_COUNT = 3;

export function normalizeHeartCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(MAX_HEART_COUNT, Math.floor(parsed));
}

export function buildEmpathyResponseForBook(
  records: StoryEmpathy[],
  authorUserId: string,
  sessionUserId?: string
) {
  const myRecord = sessionUserId
    ? records.find((entry) => entry.voterUserId === sessionUserId)
    : undefined;

  return {
    totalHearts: sumHeartCounts(records),
    myHeartCount: normalizeHeartCount(myRecord?.heartCount),
    canVote: Boolean(sessionUserId && sessionUserId !== authorUserId),
    isOwnStory: Boolean(sessionUserId && sessionUserId === authorUserId),
    voterCount: records.filter((entry) => normalizeHeartCount(entry.heartCount) > 0).length,
  };
}

export function sumHeartCounts(records: StoryEmpathy[]) {
  return records.reduce((sum, record) => sum + normalizeHeartCount(record.heartCount), 0);
}
