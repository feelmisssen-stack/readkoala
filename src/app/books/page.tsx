"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { BookShelfCard } from "@/components/BookShelfCard";
import { iconSm } from "@/lib/icon-styles";
import type { Book } from "@/lib/types";

type BookOnShelf = Book & { recordLevel?: number };

export default function BooksPage() {
  const [books, setBooks] = useState<BookOnShelf[]>([]);
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
        내가 읽은 책들을 기록하고 감상도 적어봅시다. 감상 기록이 쌓이면 잎이 진해집니다.
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
            <BookShelfCard
              key={book.id}
              book={book}
              deleting={deletingId === book.id}
              onDelete={(e) => void deleteBook(e, book)}
              onBookUpdate={handleBookUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
