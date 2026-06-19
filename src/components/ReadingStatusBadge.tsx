import { getReadingStatus, getReadingStatusLabel } from "@/lib/reading-progress";

export function ReadingStatusBadge({
  readingProgress,
  currentPage = 0,
  totalPages,
}: {
  readingProgress: number;
  currentPage?: number;
  totalPages?: number;
}) {
  const status = getReadingStatus(readingProgress, currentPage, totalPages);
  const label = getReadingStatusLabel(status);

  const colorClass =
    status === "finished"
      ? "bg-koala-primary/15 text-koala-primary"
      : status === "reading"
        ? "bg-koala-accent/20 text-koala-accent"
        : "bg-koala-secondary/25 text-koala-muted";

  return (
    <span className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
