"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { BookShelfCard } from "@/components/BookShelfCard";
import { KoalaGrowthCard } from "@/components/KoalaGrowthCard";
import { iconSm } from "@/lib/icon-styles";
import type { WritingGrowth } from "@/lib/writing-growth";
import { getWritingGrowth } from "@/lib/writing-growth";
import type { Book } from "@/lib/types";

type BookOnShelf = Book & { recordLevel?: number };

export default function BooksPage() {
  const [books, setBooks] = useState<BookOnShelf[]>([]);
  const [writingGrowth, setWritingGrowth] = useState<WritingGrowth>(getWritingGrowth(0));
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadBooks() {
    return fetch("/api/books")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setBooks(d.books || []);
          if (d.writingGrowth) {
            setWritingGrowth(getWritingGrowth(d.writingGrowth.totalBytes ?? 0));
          }
        }
      })
      .catch(() => {
        setBooks([]);
      });
  }

  useEffect(() => {
    loadBooks().finally(() => setLoading(false));
  }, []);

  const handleBookUpdate = useCallback((updated: BookOnShelf) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }, []);

  async function deleteBook(e: React.MouseEvent, book: Book) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`「${book.title}」을 책장에서 삭제할까요? 감상 기록도 함께 지워져요.`)) return;

    setDeletingId(book.id);
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (res.ok) {
        setBooks((prev) => prev.filter((b) => b.id !== book.id));
      } else {
        const data = await res.json();
        alert(data.error || "삭제에 실패했어요.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="text-center text-koala-muted">책장을 불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="inline-flex shrink-0 items-baseline gap-2 text-xl font-display text-koala-heading sm:text-2xl">
            <BookOpen className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
            내 책장
          </h1>
          <p className="text-sm text-koala-muted">
            내가 쓴 감상기록으로 잎새는 진해지고 코알라는 자라나요.
          </p>
        </div>
        <Link href="/books/new" className="koala-btn-primary inline-flex items-center gap-1.5 text-sm">
          <Plus className={iconSm} aria-hidden />
          책 추가
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4 [@media(max-height:500px)_and_(orientation:landscape)]:grid-cols-1">
        <KoalaGrowthCard growth={writingGrowth} />

        {books.length === 0 ? (
          <div className="koala-card flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="size-10 text-koala-muted/50" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-koala-muted">아직 등록한 책이 없어요.</p>
            <Link href="/books/new" className="koala-btn-accent mt-4 inline-flex items-center gap-1.5 text-sm">
              <Plus className={iconSm} aria-hidden />
              첫 책 등록하기
            </Link>
          </div>
        ) : (
          books.map((book) => (
            <BookShelfCard
              key={book.id}
              book={book}
              deleting={deletingId === book.id}
              onDelete={(e) => void deleteBook(e, book)}
              onBookUpdate={handleBookUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}
