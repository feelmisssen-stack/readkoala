import type { Book } from "./types";
import { getReadingStatus, type ReadingStatus } from "./reading-progress";

type ReadingMilestoneBook = Pick<
  Book,
  | "readingProgress"
  | "currentPage"
  | "totalPages"
  | "readingStartedAt"
  | "finishedAt"
  | "createdAt"
  | "updatedAt"
>;

export function applyReadingMilestones(
  book: Pick<Book, "readingProgress" | "currentPage" | "readingStartedAt" | "finishedAt">,
  now: string
) {
  const page = book.currentPage ?? 0;
  const started = page > 0 || book.readingProgress > 0;

  if (started && !book.readingStartedAt) {
    book.readingStartedAt = now;
  }

  if (book.readingProgress >= 100 && !book.finishedAt) {
    book.finishedAt = now;
  }
}

export function formatReadingDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatReadingDateShort(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

/** 화면 표시용 — 시작은 책 등록일(createdAt), 끝은 완독일 */
export function resolveReadingDisplayDates(book: ReadingMilestoneBook) {
  const status = getReadingStatus(
    book.readingProgress,
    book.currentPage ?? 0,
    book.totalPages
  );

  const startedAt = book.createdAt;
  const finishedAt =
    book.finishedAt ?? (status === "finished" ? book.updatedAt : undefined);

  return { status, startedAt, finishedAt };
}

export interface ReadingStatusDisplay {
  status: ReadingStatus;
  label: string;
  prefix?: string;
  suffix?: string;
}

export function buildReadingStatusDisplay(
  status: ReadingStatus,
  startedAt?: string,
  finishedAt?: string
): ReadingStatusDisplay {
  if (status === "before") {
    return { status, label: "읽기 전" };
  }

  if (status === "reading") {
    const startLabel = formatReadingDate(startedAt);
    return {
      status,
      label: "읽는 중",
      prefix: startLabel ? `${startLabel}부터` : undefined,
    };
  }

  const startLabel = formatReadingDate(startedAt);
  const endLabel = formatReadingDateShort(finishedAt) ?? formatReadingDate(finishedAt);
  return {
    status,
    label: "다 읽음",
    suffix: startLabel && endLabel ? `${startLabel}부터 ${endLabel}` : endLabel ?? undefined,
  };
}

export function getReadingStatusDisplay(book: ReadingMilestoneBook): ReadingStatusDisplay {
  const { status, startedAt, finishedAt } = resolveReadingDisplayDates(book);
  return buildReadingStatusDisplay(status, startedAt, finishedAt);
}
