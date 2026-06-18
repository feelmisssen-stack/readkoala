"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { ReadingThermometer } from "@/components/ReadingThermometer";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder";
import { iconSm } from "@/lib/icon-styles";
import type { Book } from "@/lib/types";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadBooks() {
    return fetch("/api/books")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setBooks(d.books || []);
      });
  }

  useEffect(() => {
    loadBooks().finally(() => setLoading(false));
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
      <div className="flex items-center justify-between">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-koala-primary">
          <BookOpen className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
          내 책장
        </h1>
        <Link href="/books/new" className="koala-btn-primary inline-flex items-center gap-1.5 text-sm">
          <Plus className={iconSm} aria-hidden />
          책 추가
        </Link>
      </div>

      <p className="rounded-koala bg-koala-secondary/15 px-4 py-3 text-sm text-koala-muted">
        책을 누르면 독서 온도계를 조절하고, 읽기 전·중·후{" "}
        <strong className="text-koala-primary">감상도 바로 쓸 수 있어요.</strong>
      </p>

      {books.length === 0 ? (
        <div className="koala-card p-8 text-center">
          <BookOpen className="mx-auto size-10 text-koala-muted/50" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-koala-muted">아직 등록한 책이 없어요.</p>
          <Link href="/books/new" className="koala-btn-accent mt-4 inline-flex items-center gap-1.5 text-sm">
            <Plus className={iconSm} aria-hidden />
            첫 책 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => (
            <div key={book.id} className="koala-card relative p-4 transition hover:shadow-md">
              <button
                type="button"
                onClick={(e) => deleteBook(e, book)}
                disabled={deletingId === book.id}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-pill bg-koala-card/90 px-2 py-0.5 text-xs text-red-500 shadow-sm hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="size-3" aria-hidden />
                {deletingId === book.id ? "삭제 중..." : "삭제"}
              </button>
              <Link href={`/books/${book.id}`} className="flex gap-4">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-koala bg-koala-secondary/20">
                  {book.coverUrl ? (
                    <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
                  ) : (
                    <BookCoverPlaceholder />
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-10">
                  <h2 className="truncate font-bold text-koala-primary">{book.title}</h2>
                  {book.author && <p className="text-sm text-koala-muted">{book.author}</p>}
                  <div className="mt-2">
                    <ReadingThermometer progress={book.readingProgress} />
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
