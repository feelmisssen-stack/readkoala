"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IsbnScanner } from "@/components/IsbnScanner";
import type { BookSearchResult } from "@/lib/types";

export default function NewBookPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isbn, setIsbn] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(keyword?: string, isbnValue?: string) {
    setLoading(true);
    setError("");
    try {
      const params = isbnValue
        ? `isbn=${encodeURIComponent(isbnValue)}`
        : `q=${encodeURIComponent(keyword || query)}`;
      const res = await fetch(`/api/books/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        setError("검색 결과가 없어요. 다른 단어로 검색해 보세요.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function addBook(book: BookSearchResult) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(data.error || "책 등록에 실패했어요.");
        return;
      }
      router.push(`/books/${data.book.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-koala-primary">책 등록하기</h1>

      <div className="koala-card space-y-4 p-5">
        <div>
          <label className="koala-label">책 제목이나 저자로 검색</label>
          <div className="flex gap-2">
            <input
              className="koala-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 피노키오"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button type="button" onClick={() => search()} disabled={loading} className="koala-btn-primary shrink-0">
              검색
            </button>
          </div>
        </div>

        <div className="border-t border-koala-secondary/30 pt-4">
          <label className="koala-label">ISBN으로 검색</label>
          <div className="flex gap-2">
            <input
              className="koala-input"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978..."
            />
            <button
              type="button"
              onClick={() => search(undefined, isbn)}
              disabled={loading || !isbn}
              className="koala-btn-secondary shrink-0"
            >
              ISBN 검색
            </button>
          </div>
          <div className="mt-3">
            <IsbnScanner
              onScan={(code) => {
                setIsbn(code);
                search(undefined, code);
              }}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-koala-muted">검색 결과</h2>
          {results.map((book, i) => (
            <div key={i} className="koala-card flex gap-4 p-4">
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-koala bg-koala-secondary/20">
                {book.coverUrl ? (
                  <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">📖</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-koala-primary">{book.title}</h3>
                {book.author && <p className="text-sm text-koala-muted">{book.author}</p>}
                {book.publisher && <p className="text-xs text-koala-muted">{book.publisher}</p>}
                <button
                  type="button"
                  onClick={() => addBook(book)}
                  disabled={loading}
                  className="koala-btn-primary mt-2 text-sm"
                >
                  내 책장에 추가
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
