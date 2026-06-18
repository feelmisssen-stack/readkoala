"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { iconLg } from "@/lib/icon-styles";
import type { CarouselFeedItem } from "@/lib/types";

const SLIDE_INTERVAL_MS = 3000;

/** 불규칙 모자이크 배치 (4열 그리드 기준) */
const TILE_PATTERNS = [
  "col-span-2 row-span-3",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-2",
];

export function FriendFeedMosaic() {
  const [items, setItems] = useState<CarouselFeedItem[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed/carousel")
      .then((r) => r.json())
      .then((d) => {
        const list: CarouselFeedItem[] = d.items || [];
        setItems(list);
        if (list.length > 0) setFocusedId(list[0].id);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const focusedItem = items.find((item) => item.id === focusedId);
  const slideCount = focusedItem ? 1 + focusedItem.moments.length : 0;

  useEffect(() => {
    setSlideIndex(0);
  }, [focusedId]);

  useEffect(() => {
    if (!focusedItem || slideCount <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideCount);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [focusedItem, slideCount]);

  const getTileState = useCallback(
    (item: CarouselFeedItem) => {
      const isFocused = item.id === focusedId;
      if (!isFocused) return { mode: "cover" as const };
      if (slideIndex === 0) return { mode: "cover" as const };
      const moment = item.moments[slideIndex - 1];
      return moment ? { mode: "moment" as const, moment } : { mode: "cover" as const };
    },
    [focusedId, slideIndex]
  );

  if (loading) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-koala-lg bg-[#1e2420]">
        <p className="text-sm text-white/60">친구들의 기록을 불러오는 중...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center rounded-koala-lg bg-[#1e2420] p-8 text-center">
        <p className="text-white/70">아직 공유된 감상이 없어요.</p>
        <p className="mt-2 text-sm text-white/50">책을 읽고 첫 기록을 남겨 보세요.</p>
      </div>
    );
  }

  const displayItems = items.slice(0, Math.max(items.length, 8));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-koala-primary">친구들의 책 이야기</h2>
        <p className="text-xs text-koala-muted">책을 누르면 감상이 바뀌어요</p>
      </div>

      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-3 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-koala-lg bg-[#1a1f1c] p-3 shadow-inner sm:p-4">
          <div
            className="grid auto-rows-[72px] grid-cols-4 gap-2 sm:auto-rows-[80px] sm:grid-cols-4 sm:gap-2.5 md:grid-cols-4"
            style={{ gridAutoFlow: "dense" }}
          >
            {displayItems.map((item, index) => {
              const pattern = TILE_PATTERNS[index % TILE_PATTERNS.length];
              const state = getTileState(item);
              const isFocused = item.id === focusedId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFocusedId(item.id)}
                  className={`relative overflow-hidden rounded-md border transition-all duration-300 ${pattern} ${
                    isFocused
                      ? "z-10 border-koala-accent/80 ring-2 ring-koala-accent/40"
                      : "border-white/10 opacity-85 hover:opacity-100"
                  }`}
                >
                  {state.mode === "cover" ? (
                    <>
                      <div className="absolute inset-0 bg-koala-secondary/20">
                        {item.coverUrl ? (
                          <Image
                            src={item.coverUrl}
                            alt={item.bookTitle}
                            fill
                            className="object-cover"
                            sizes="(max-width:768px) 25vw, 180px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 bg-koala-primary/30 p-2">
                            <BookOpen className={`${iconLg} text-white/70`} strokeWidth={1.5} aria-hidden />
                            <span className="line-clamp-2 text-center text-[10px] font-medium text-white/90 sm:text-xs">
                              {item.bookTitle}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                        <p className="truncate text-[10px] text-white/70 sm:text-xs">{item.username}</p>
                        <p className="truncate text-xs font-medium text-white sm:text-sm">{item.bookTitle}</p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col bg-koala-primary/95 p-2.5 text-left sm:p-3">
                      <p className="text-[10px] text-koala-accent sm:text-xs">{state.moment.label}</p>
                      <p className="mt-1 line-clamp-6 flex-1 text-[11px] leading-snug text-white sm:text-sm sm:leading-relaxed">
                        &ldquo;{state.moment.text}&rdquo;
                      </p>
                      <p className="mt-1 truncate text-[10px] text-white/60">{item.bookTitle}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {focusedItem && focusedItem.moments.length > 0 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {Array.from({ length: slideCount }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    slideIndex === i ? "w-5 bg-koala-accent" : "w-1 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
