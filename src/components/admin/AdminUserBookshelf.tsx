"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, BookOpen, ImageIcon } from "lucide-react";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder";
import { KoalaGrowthCard } from "@/components/KoalaGrowthCard";
import { ReadingRecordLeafStamp } from "@/components/ReadingRecordLeafStamp";
import { getWritingGrowth, type WritingGrowth } from "@/lib/writing-growth";
import type { AdminReflectionSection } from "@/lib/reflection-admin-view";
import type { Book } from "@/lib/types";

type ShelfBook = Book & {
  recordLevel?: number;
  reflectionUpdatedAt?: string | null;
  hasSceneImage?: boolean;
  reflectionSections?: AdminReflectionSection[];
};

interface AdminUserBookshelfProps {
  userId: string;
  label: string;
  onBack: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ko-KR");
}

function BookCover({ book, className }: { book: ShelfBook; className: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-koala bg-koala-secondary/20 ${className}`}>
      {book.coverUrl ? (
        <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
      ) : (
        <BookCoverPlaceholder />
      )}
    </div>
  );
}

function AdminShelfCard({ book, onOpen }: { book: ShelfBook; onOpen: () => void }) {
  const progress = Math.max(0, Math.min(100, Math.round(book.readingProgress ?? 0)));
  const pageText =
    book.totalPages && book.totalPages > 0
      ? `${book.currentPage ?? 0} / ${book.totalPages}쪽`
      : null;
  const finished = formatDate(book.finishedAt);
  const sectionCount = book.reflectionSections?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="koala-card relative flex min-w-0 gap-3 p-3 text-left transition hover:ring-2 hover:ring-koala-primary/30 sm:p-4"
    >
      <BookCover book={book} className="h-24 w-[4.5rem] sm:h-28 sm:w-20" />

      <div className={`min-w-0 flex-1 ${book.hasSceneImage ? "pr-20" : "pr-10"}`}>
        <h3 className="truncate font-display text-koala-heading">{book.title}</h3>
        {book.author && <p className="truncate text-sm text-koala-muted">{book.author}</p>}

        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-koala-muted">
            <span>{progress}%</span>
            {pageText && <span>{pageText}</span>}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-koala-secondary/55">
            <div className="h-full rounded-pill bg-koala-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="mt-2 text-xs text-koala-muted">
          등록 {formatDate(book.createdAt)}
          {finished && ` · 다 읽음 ${finished}`}
        </p>
        <p className={`mt-1 text-xs ${sectionCount > 0 ? "text-koala-primary" : "text-koala-muted"}`}>
          {sectionCount > 0 ? `기록 ${sectionCount}개 · 눌러서 보기` : "아직 쓴 기록이 없어요"}
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5">
        {book.hasSceneImage && (
          <span title="그림을 넣은 책" aria-label="그림을 넣은 책">
            <ImageIcon className="size-7 text-koala-accent" strokeWidth={1.75} aria-hidden />
          </span>
        )}
        {book.recordLevel != null && book.recordLevel > 0 && (
          <ReadingRecordLeafStamp level={book.recordLevel} />
        )}
      </div>
    </button>
  );
}

function ReflectionSectionView({ section }: { section: AdminReflectionSection }) {
  return (
    <section className="koala-card space-y-3 p-4 sm:p-5">
      <h3 className="font-display text-koala-heading">{section.title}</h3>

      {section.pairs && (
        <ul className="space-y-3">
          {section.pairs.map((pair, index) => (
            <li key={index} className="rounded-koala bg-koala-secondary/15 p-3 text-sm">
              {pair.label && <p className="mb-2 font-medium text-koala-primary">{pair.label}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-koala-muted">질문하기</p>
                  <p className="whitespace-pre-wrap">{pair.ask || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-koala-muted">짐작하기</p>
                  <p className="whitespace-pre-wrap">{pair.guess || "—"}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {section.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{section.text}</p>}

      {section.fields && (
        <dl className="space-y-3">
          {section.fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-koala-muted">{field.label}</dt>
              <dd className="whitespace-pre-wrap text-sm leading-relaxed">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {section.imageUrl && (
        <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-koala bg-koala-secondary/20">
          <Image src={section.imageUrl} alt="기억에 남는 장면" fill className="object-contain" unoptimized />
        </div>
      )}
    </section>
  );
}

function AdminBookReflection({ book, onBack }: { book: ShelfBook; onBack: () => void }) {
  const sections = book.reflectionSections ?? [];
  const updated = formatDate(book.reflectionUpdatedAt);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="koala-btn-secondary inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        책장으로
      </button>

      <div className="flex gap-3">
        <BookCover book={book} className="h-24 w-[4.5rem]" />
        <div className="min-w-0">
          <h3 className="font-display text-lg text-koala-heading">{book.title}</h3>
          {book.author && <p className="text-sm text-koala-muted">{book.author}</p>}
          {updated && <p className="mt-1 text-xs text-koala-muted">마지막 저장 {updated}</p>}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="koala-card p-8 text-center text-sm text-koala-muted">
          이 책에는 아직 쓴 기록이 없어요.
        </div>
      ) : (
        sections.map((section) => <ReflectionSectionView key={section.title} section={section} />)
      )}
    </div>
  );
}

export function AdminUserBookshelf({ userId, label, onBack }: AdminUserBookshelfProps) {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [growth, setGrowth] = useState<WritingGrowth>(getWritingGrowth(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    setOpenBookId(null);
    fetch(`/api/admin/users/${encodeURIComponent(userId)}/books`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "책장을 불러오지 못했어요.");
        setBooks(data.books ?? []);
        setGrowth(getWritingGrowth(data.writingGrowth?.totalBytes ?? 0));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "책장을 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const openBook = books.find((book) => book.id === openBookId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="koala-btn-secondary inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          회원 목록
        </button>
        <h2 className="inline-flex items-center gap-2 font-display text-lg text-koala-heading">
          <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
          {label}의 책장
        </h2>
        <span className="text-xs text-koala-muted">읽기 전용</span>
      </div>

      {loading && <p className="text-sm text-koala-muted">책장을 불러오는 중...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && openBook && (
        <AdminBookReflection book={openBook} onBack={() => setOpenBookId(null)} />
      )}

      {!loading && !error && !openBook && (
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4">
          <KoalaGrowthCard growth={growth} />
          {books.length === 0 ? (
            <div className="koala-card flex items-center justify-center p-8 text-sm text-koala-muted">
              아직 등록한 책이 없어요.
            </div>
          ) : (
            books.map((book) => (
              <AdminShelfCard key={book.id} book={book} onOpen={() => setOpenBookId(book.id)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
