export type ReadingStatus = "before" | "reading" | "finished";

export function calcProgressFromPages(currentPage: number, totalPages?: number): number {
  if (!totalPages || totalPages <= 0) {
    if (currentPage <= 0) return 0;
    return currentPage >= 1 ? 1 : 0;
  }
  const clamped = Math.max(0, Math.min(currentPage, totalPages));
  return Math.round((clamped / totalPages) * 100);
}

export function getReadingStatus(
  readingProgress: number,
  currentPage = 0,
  totalPages?: number
): ReadingStatus {
  if (totalPages && totalPages > 0 && currentPage >= totalPages) return "finished";
  if (readingProgress >= 100) return "finished";
  if (readingProgress <= 0 && currentPage <= 0) return "before";
  return "reading";
}

export function getReadingStatusLabel(status: ReadingStatus): string {
  switch (status) {
    case "before":
      return "읽기 전";
    case "reading":
      return "읽는 중";
    case "finished":
      return "다 읽음";
  }
}

export function getBarPercent(
  readingProgress: number,
  currentPage = 0,
  totalPages?: number
): number {
  if (totalPages && totalPages > 0) {
    return calcProgressFromPages(currentPage, totalPages);
  }
  return Math.max(0, Math.min(100, readingProgress));
}
