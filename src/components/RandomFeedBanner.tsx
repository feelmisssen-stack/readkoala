"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, PenLine } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";

interface FeedItem {
  type: string;
  text: string;
  bookTitle?: string;
  word?: string;
  username: string;
}

const TYPE_LABELS: Record<string, string> = {
  before_question: "읽기 전 생각",
  during_question: "읽는 중 생각",
  association: "이 책은 이럴때",
  quote: "책속 한마디",
  shared_sentence: "낱말 문장",
};

export function RandomFeedBanner() {
  const [item, setItem] = useState<FeedItem | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const hideUntil = localStorage.getItem("feed_hide_until");
    if (hideUntil && Date.now() < Number(hideUntil)) {
      setHidden(true);
      return;
    }
    fetch("/api/feed/random")
      .then((r) => r.json())
      .then((d) => setItem(d.item))
      .catch(() => setItem(null));
  }, []);

  function hideForToday() {
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);
    localStorage.setItem("feed_hide_until", String(tomorrow.getTime()));
    setHidden(true);
  }

  if (hidden || !item) return null;

  return (
    <div className="koala-card relative mb-6 overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-koala-lg bg-koala-accent/20" />
      <div className="relative">
        <span className="inline-block rounded-pill bg-koala-accent/30 px-3 py-0.5 text-xs font-medium text-koala-accent">
          {TYPE_LABELS[item.type] || "오늘의 한마디"}
        </span>
        <p className="mt-3 text-lg leading-relaxed">&ldquo;{item.text}&rdquo;</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-koala-muted">
          {item.bookTitle && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className={iconSm} aria-hidden />
              {item.bookTitle}
            </span>
          )}
          {item.word && (
            <span className="inline-flex items-center gap-1">
              <PenLine className={iconSm} aria-hidden />
              {item.word}
            </span>
          )}
          <span>{item.username}</span>
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/reflections/new" className="koala-btn-primary text-sm">
            나도 감상 쓰기
          </Link>
          <button type="button" onClick={hideForToday} className="koala-btn-secondary text-sm">
            오늘 하루 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}
