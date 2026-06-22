import { getReadingStatus } from "@/lib/reading-progress";
import {
  buildReadingStatusDisplay,
  resolveReadingDisplayDates,
} from "@/lib/reading-dates";

export function ReadingStatusBadge({
  readingProgress,
  currentPage = 0,
  totalPages,
  startedAt,
  finishedAt,
}: {
  readingProgress: number;
  currentPage?: number;
  totalPages?: number;
  startedAt?: string;
  finishedAt?: string;
}) {
  const status = getReadingStatus(readingProgress, currentPage, totalPages);
  const display = buildReadingStatusDisplay(status, startedAt, finishedAt);

  const colorClass =
    status === "finished"
      ? "bg-koala-primary/15 text-koala-primary"
      : status === "reading"
        ? "bg-koala-accent/20 text-koala-accent"
        : "bg-koala-secondary/25 text-koala-muted";

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      {display.prefix && <span className="text-koala-muted">{display.prefix}</span>}
      <span className={`inline-block rounded-pill px-2.5 py-0.5 font-medium ${colorClass}`}>
        {display.label}
      </span>
      {display.suffix && <span className="text-koala-muted">{display.suffix}</span>}
    </div>
  );
}

export function ReadingStatusBadgeFromBook(
  book: Parameters<typeof resolveReadingDisplayDates>[0]
) {
  const { status, startedAt, finishedAt } = resolveReadingDisplayDates(book);
  return (
    <ReadingStatusBadge
      readingProgress={book.readingProgress}
      currentPage={book.currentPage}
      totalPages={book.totalPages}
      startedAt={startedAt}
      finishedAt={finishedAt}
    />
  );
}
