"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { iconMd } from "@/lib/icon-styles";
import type { CarouselFeedItem } from "@/lib/types";

const SLIDE_INTERVAL_MS = 3000;

export function FriendFeedCarousel() {
  const [items, setItems] = useState<CarouselFeedItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/feed/carousel")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const activeItem = items[activeIndex];
  const slideCount = activeItem ? 1 + activeItem.moments.length : 0;

  useEffect(() => {
    setSlideIndex(0);
  }, [activeIndex]);

  useEffect(() => {
    if (!activeItem || slideCount <= 1) return;

    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideCount);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeItem, slideCount]);

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveIndex(index);
  }, []);

  function goPrev() {
    if (items.length === 0) return;
    scrollToIndex((activeIndex - 1 + items.length) % items.length);
  }

  function goNext() {
    if (items.length === 0) return;
    scrollToIndex((activeIndex + 1) % items.length);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      const container = scrollRef.current;
      if (!container) return;
      const cards = Array.from(container.children) as HTMLElement[];
      if (cards.length === 0) return;
      const center = container.scrollLeft + container.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setActiveIndex(closest);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-koala-lg bg-koala-secondary/10">
        <p className="text-sm text-koala-muted">친구들의 기록을 불러오는 중...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="koala-card flex h-80 flex-col items-center justify-center p-8 text-center">
        <p className="text-koala-muted">아직 공유된 감상이 없어요.</p>
        <p className="mt-2 text-sm text-koala-muted">책을 읽고 첫 기록을 남겨 보세요.</p>
      </div>
    );
  }

  const showingCover = slideIndex === 0;
  const moment = !showingCover ? activeItem?.moments[slideIndex - 1] : null;

  return (
    <section className="relative">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-koala-primary">친구들의 책 이야기</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-koala-secondary/40 bg-koala-card text-koala-primary transition hover:bg-koala-secondary/20"
            aria-label="이전"
          >
            <ChevronLeft className={iconMd} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-koala-secondary/40 bg-koala-card text-koala-primary transition hover:bg-koala-secondary/20"
            aria-label="다음"
          >
            <ChevronRight className={iconMd} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const isCover = isActive && showingCover;
          const activeMoment = isActive && !showingCover ? moment : null;

          return (
            <article
              key={item.id}
              className={`w-[min(85vw,320px)] shrink-0 snap-center transition-opacity duration-500 ${
                isActive ? "opacity-100" : "opacity-60"
              }`}
            >
              <div className="koala-card flex h-[420px] flex-col overflow-hidden">
                {isCover ? (
                  <>
                    <div className="relative flex-1 bg-koala-secondary/15">
                      {item.coverUrl ? (
                        <Image
                          src={item.coverUrl}
                          alt={item.bookTitle}
                          fill
                          className="object-cover"
                          sizes="320px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center">
                          <span className="text-2xl font-bold text-koala-primary">{item.bookTitle}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-koala-secondary/20 p-4">
                      <p className="text-xs text-koala-muted">{item.username}</p>
                      <h3 className="mt-1 font-bold text-koala-primary">{item.bookTitle}</h3>
                      {item.bookAuthor && (
                        <p className="mt-0.5 text-sm text-koala-muted">{item.bookAuthor}</p>
                      )}
                    </div>
                  </>
                ) : isActive && activeMoment ? (
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-start gap-3">
                      {item.coverUrl && (
                        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded shadow-sm">
                          <Image
                            src={item.coverUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-koala-muted">{item.username}</p>
                        <p className="truncate text-sm font-medium text-koala-primary">{item.bookTitle}</p>
                      </div>
                    </div>
                    <span className="inline-block w-fit rounded-pill bg-koala-accent/20 px-3 py-0.5 text-xs font-medium text-koala-accent">
                      {activeMoment.label}
                    </span>
                    <p className="mt-4 flex-1 text-base leading-relaxed transition-opacity duration-500">
                      &ldquo;{activeMoment.text}&rdquo;
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative flex-1 bg-koala-secondary/15">
                      {item.coverUrl ? (
                        <Image
                          src={item.coverUrl}
                          alt={item.bookTitle}
                          fill
                          className="object-cover"
                          sizes="320px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center">
                          <span className="text-xl font-bold text-koala-primary">{item.bookTitle}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-koala-secondary/20 p-4">
                      <p className="text-xs text-koala-muted">{item.username}</p>
                      <h3 className="mt-1 font-bold text-koala-primary">{item.bookTitle}</h3>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {activeItem && activeItem.moments.length > 0 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlideIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                slideIndex === i ? "w-6 bg-koala-primary" : "w-1.5 bg-koala-secondary/40"
              }`}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
