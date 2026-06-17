"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ReadingThermometer } from "@/components/ReadingThermometer";
import type { Book } from "@/lib/types";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
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
    return <p className="text-center text-koala-muted">책장을 불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-koala-primary">내 책장</h1>
        <Link href="/books/new" className="koala-btn-primary text-sm">
          + 책 추가
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="koala-card p-8 text-center">
          <p className="text-koala-muted">아직 등록한 책이 없어요.</p>
          <Link href="/books/new" className="koala-btn-accent mt-4 inline-block text-sm">
            첫 책 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`} className="koala-card block p-4 transition hover:shadow-md">
              <div className="flex gap-4">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-koala bg-koala-secondary/20">
                  {book.coverUrl ? (
                    <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl">📖</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-bold text-koala-primary">{book.title}</h2>
                  {book.author && <p className="text-sm text-koala-muted">{book.author}</p>}
                  <div className="mt-2">
                    <ReadingThermometer progress={book.readingProgress} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
