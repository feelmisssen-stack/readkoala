"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Lightbulb, PenLine, Quote, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReadingThermometer } from "@/components/ReadingThermometer";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder";
import { iconMd } from "@/lib/icon-styles";
import { SECTION_LABELS, SECTION_ORDER, type ReflectionSection } from "@/lib/reflection-templates";
import type { Book } from "@/lib/types";

const SECTION_ICONS: Record<ReflectionSection, LucideIcon> = {
  before_reading: Sprout,
  during_reading: BookOpen,
  association: Lightbulb,
  quote: Quote,
  review: PenLine,
};

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

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
        const found = (d?.books || []).find((b: Book) => b.id === id);
        if (found) {
          setBook(found);
          setProgress(found.readingProgress);
        }
      });
  }, [id]);

  async function saveProgress(value: number) {
    setProgress(value);
    setSaving(true);
    try {
      await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingProgress: value }),
      });
    } finally {
      setSaving(false);
    }
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-koala-primary">{book.title}</h1>
          {book.author && <p className="mt-1 text-koala-muted">{book.author}</p>}
          {book.publisher && <p className="text-sm text-koala-muted">{book.publisher}</p>}
          <div className="mt-4">
            <ReadingThermometer progress={progress} />
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => saveProgress(Number(e.target.value))}
              className="mt-2 w-full accent-koala-accent"
            />
            {saving && <p className="text-xs text-koala-muted">저장 중...</p>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-koala-primary">감상 기록하기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTION_ORDER.map((section: ReflectionSection) => {
            const Icon = SECTION_ICONS[section];
            return (
              <Link
                key={section}
                href={`/books/${id}/write/${section}`}
                className="koala-card block p-4 transition hover:bg-koala-secondary/10"
              >
                <Icon className={`${iconMd} text-koala-primary`} strokeWidth={1.75} aria-hidden />
                <h3 className="mt-2 font-medium text-koala-primary">{SECTION_LABELS[section]}</h3>
                <p className="text-xs text-koala-muted">선택해서 작성할 수 있어요</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
