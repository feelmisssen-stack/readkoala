"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/types";

export default function NewReflectionPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (d) setBooks(d.books || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center text-koala-muted">불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display text-koala-heading">감상 쓰기</h1>
      <p className="text-koala-muted">어떤 책에 대한 감상을 쓸까요?</p>

      {books.length === 0 ? (
        <div className="koala-card p-8 text-center">
          <p className="text-koala-muted">먼저 책을 등록해 주세요.</p>
          <Link href="/books/new" className="koala-btn-primary mt-4 inline-block">
            책 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}/write/before_reading`}
              className="koala-card block p-4 transition hover:bg-koala-secondary/30"
            >
              <h2 className="font-display text-koala-heading">{book.title}</h2>
              {book.author && <p className="text-sm text-koala-muted">{book.author}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
