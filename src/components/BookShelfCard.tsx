"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ReadingRecordLeafStamp } from "@/components/ReadingRecordLeafStamp";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder";
import type { Book } from "@/lib/types";

type BookOnShelf = Book & { recordLevel?: number };

interface BookShelfCardProps {
  book: BookOnShelf;
  deleting: boolean;
  onDelete: (e: React.MouseEvent) => void;
  onBookUpdate: (book: BookOnShelf) => void;
}

export function BookShelfCard({ book, deleting, onDelete, onBookUpdate }: BookShelfCardProps) {
  const [currentPage, setCurrentPage] = useState(book.currentPage ?? 0);
  const [totalPages, setTotalPages] = useState(book.totalPages);
  const [readingProgress, setReadingProgress] = useState(book.readingProgress);
  const [readingStartedAt, setReadingStartedAt] = useState(book.readingStartedAt);
  const [finishedAt, setFinishedAt] = useState(book.finishedAt);
  const [saving, setSaving] = useState(false);
  const [fetchingTotalPages, setFetchingTotalPages] = useState(false);

  useEffect(() => {
    setCurrentPage(book.currentPage ?? 0);
    setTotalPages(book.totalPages);
    setReadingProgress(book.readingProgress);
    setReadingStartedAt(book.readingStartedAt);
    setFinishedAt(book.finishedAt);
  }, [book]);

  const patchBook = useCallback(
    async (body: Record<string, number | undefined>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/books/${book.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return false;

        const data = await res.json();
        const saved = data.book as
          | {
              readingProgress?: number;
              currentPage?: number;
              readingStartedAt?: string;
              finishedAt?: string;
            }
          | undefined;

        const nextPage = body.currentPage !== undefined ? body.currentPage : currentPage;
        const nextTotal =
          body.totalPages !== undefined
            ? body.totalPages > 0
              ? body.totalPages
              : undefined
            : totalPages;
        const nextProgress = saved?.readingProgress ?? readingProgress;

        if (body.currentPage !== undefined) setCurrentPage(body.currentPage);
        if (body.totalPages !== undefined) {
          setTotalPages(body.totalPages > 0 ? body.totalPages : undefined);
        }
        if (saved?.readingProgress !== undefined) setReadingProgress(saved.readingProgress);
        if (saved?.readingStartedAt) setReadingStartedAt(saved.readingStartedAt);
        if (saved?.finishedAt) setFinishedAt(saved.finishedAt);

        onBookUpdate({
          ...book,
          currentPage: nextPage,
          totalPages: nextTotal,
          readingProgress: nextProgress,
          readingStartedAt: saved?.readingStartedAt ?? readingStartedAt,
          finishedAt: saved?.finishedAt ?? finishedAt,
        });

        return true;
      } finally {
        setSaving(false);
      }
    },
    [book, currentPage, totalPages, readingProgress, readingStartedAt, finishedAt, onBookUpdate]
  );

  useEffect(() => {
    if (!book.isbn || book.totalPages) return;

    let cancelled = false;
    setFetchingTotalPages(true);

    fetch(`/api/books/search?isbn=${encodeURIComponent(book.isbn)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled) return;
        const pages = data.results?.[0]?.totalPages;
        if (pages && pages > 0) {
          await patchBook({ totalPages: pages });
        }
      })
      .finally(() => {
        if (!cancelled) setFetchingTotalPages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [book.id, book.isbn, book.totalPages, patchBook]);

  return (
    <div className="koala-card relative flex h-full min-w-0 flex-col overflow-hidden p-3 transition hover:bg-koala-secondary/30 sm:p-4">
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-pill bg-koala-card/90 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="size-3" aria-hidden />
        {deleting ? "삭제 중..." : "삭제"}
      </button>

      <div className="flex min-w-0 gap-2 sm:gap-3">
        <Link
          href={`/books/${book.id}`}
          className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-koala bg-koala-secondary/20 sm:h-28 sm:w-20"
        >
          {book.coverUrl ? (
            <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
          ) : (
            <BookCoverPlaceholder />
          )}
        </Link>

        <div className="min-w-0 flex-1 pr-6 sm:pr-8">
          <Link href={`/books/${book.id}`} className="block hover:opacity-90">
            <h2 className="truncate font-display text-koala-heading">{book.title}</h2>
            {book.author && <p className="truncate text-sm text-koala-muted">{book.author}</p>}
          </Link>

          <div className="mt-2">
            <ReadingProgress
              compact
              readingProgress={readingProgress}
              currentPage={currentPage}
              totalPages={totalPages}
              createdAt={book.createdAt}
              updatedAt={book.updatedAt}
              finishedAt={finishedAt}
              fetchingTotalPages={fetchingTotalPages}
              onCurrentPageCommit={(page) => void patchBook({ currentPage: page })}
              onTotalPagesCommit={(pages) => void patchBook({ totalPages: pages, currentPage })}
              saving={saving}
            />
          </div>
        </div>
      </div>

      {book.recordLevel != null && book.recordLevel > 0 && (
        <ReadingRecordLeafStamp
          level={book.recordLevel}
          className="absolute bottom-3 right-3 z-10"
        />
      )}
    </div>
  );
}
