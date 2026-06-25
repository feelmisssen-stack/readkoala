"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { MemorableSceneMenuCard } from "@/components/MemorableSceneMenuCard";
import { ReadingProgress } from "@/components/ReadingProgress";
import { StoryEmpathyPanel } from "@/components/StoryEmpathyPanel";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder";
import { iconMd } from "@/lib/icon-styles";
import { hasReflectionSectionContent } from "@/lib/gamification";
import { SECTION_LABELS, SECTION_ORDER, type ReflectionSection } from "@/lib/reflection-templates";
import { SECTION_ICONS } from "@/lib/section-icons";
import type { Book, Reflection } from "@/lib/types";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState<number | undefined>();
  const [readingProgress, setReadingProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fetchingTotalPages, setFetchingTotalPages] = useState(false);
  const [reflection, setReflection] = useState<Reflection | null>(null);

  const patchBook = useCallback(
    async (body: Record<string, number | undefined>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/books/${id}`, {
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

        if (body.currentPage !== undefined) setCurrentPage(body.currentPage);
        if (body.totalPages !== undefined) {
          setTotalPages(body.totalPages > 0 ? body.totalPages : undefined);
        }
        if (saved?.readingProgress !== undefined) setReadingProgress(saved.readingProgress);

        setBook((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (body.currentPage !== undefined) next.currentPage = body.currentPage;
          if (body.totalPages !== undefined) {
            next.totalPages = body.totalPages > 0 ? body.totalPages : undefined;
          }
          if (saved?.readingProgress !== undefined) next.readingProgress = saved.readingProgress;
          if (saved?.readingStartedAt) next.readingStartedAt = saved.readingStartedAt;
          if (saved?.finishedAt) next.finishedAt = saved.finishedAt;
          return next;
        });

        if (!saved?.readingProgress) {
          const page = body.currentPage ?? currentPage;
          const total = body.totalPages !== undefined
            ? (body.totalPages > 0 ? body.totalPages : undefined)
            : totalPages;
          if (total && total > 0 && page >= 0) {
            const progress = Math.round((Math.min(page, total) / total) * 100);
            setReadingProgress(progress);
          }
        }

        return true;
      } finally {
        setSaving(false);
      }
    },
    [id, currentPage, totalPages]
  );

  useEffect(() => {
    fetch("/api/books")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        const found = (d?.books || []).find((b: Book) => b.id === id);
        if (found) {
          setBook(found);
          setCurrentPage(found.currentPage ?? 0);
          setTotalPages(found.totalPages);
          setReadingProgress(found.readingProgress);
        }
      });
  }, [id]);

  useEffect(() => {
    if (!book?.isbn || book.totalPages) return;

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
  }, [book?.id, book?.isbn, book?.totalPages, patchBook]);

  useEffect(() => {
    fetch(`/api/reflections?bookId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setReflection(d.reflections?.[0] ?? null);
      })
      .catch(() => {});
  }, [id]);

  async function saveCurrentPage(page: number) {
    await patchBook({ currentPage: page });
  }

  async function saveTotalPages(pages: number) {
    await patchBook({ totalPages: pages, currentPage });
  }

  if (!book) {
    return <p className="text-center text-koala-muted">책 정보를 불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="koala-card flex flex-col gap-6 p-6 sm:flex-row">
        <div className="relative mx-auto h-56 w-40 shrink-0 overflow-hidden rounded-koala-lg bg-koala-secondary/20 sm:mx-0">
          {book.coverUrl ? (
            <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
          ) : (
            <BookCoverPlaceholder size="lg" />
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute right-0 top-0">
            <StoryEmpathyPanel bookId={id} />
          </div>
          <h1 className="pr-28 text-2xl font-bold text-koala-primary">{book.title}</h1>
          {book.author && <p className="mt-1 text-koala-muted">{book.author}</p>}
          {book.publisher && <p className="text-sm text-koala-muted">{book.publisher}</p>}
          <div className="mt-4">
            <ReadingProgress
              readingProgress={readingProgress}
              currentPage={currentPage}
              totalPages={totalPages}
              createdAt={book.createdAt}
              updatedAt={book.updatedAt}
              finishedAt={book.finishedAt}
              fetchingTotalPages={fetchingTotalPages}
              onCurrentPageCommit={saveCurrentPage}
              onTotalPagesCommit={saveTotalPages}
              saving={saving}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold text-koala-primary">감상 기록하기</h2>
          <span className="text-sm text-koala-muted">쓰고 싶은 칸만 쓰세요</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTION_ORDER.map((section: ReflectionSection) => {
            if (section === "memorable_scene") {
              return (
                <MemorableSceneMenuCard
                  key={section}
                  bookId={id}
                  initialImageUrl={reflection?.memorableSceneImage}
                  onUploaded={(url) =>
                    setReflection((prev) =>
                      prev ? { ...prev, memorableSceneImage: url } : prev
                    )
                  }
                  onDeleted={() =>
                    setReflection((prev) =>
                      prev ? { ...prev, memorableSceneImage: undefined } : prev
                    )
                  }
                />
              );
            }

            const Icon = SECTION_ICONS[section];
            const recorded = hasReflectionSectionContent(reflection, section);
            return (
              <Link
                key={section}
                href={`/books/${id}/write/${section}`}
                className={`koala-card flex items-center gap-3 p-4 transition ${
                  recorded ? "koala-card-recorded" : "hover:bg-koala-secondary/10"
                }`}
              >
                <Icon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-koala-primary">{SECTION_LABELS[section]}</h3>
                  {section === "review" && (
                    <p className="mt-0.5 text-xs text-koala-muted">한 편의 멋진 감상문을 써 봅시다!</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
