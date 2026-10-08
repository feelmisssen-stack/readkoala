"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { LoginForm } from "@/components/LoginForm";
import { iconLg } from "@/lib/icon-styles";
import type { CarouselFeedItem, CarouselMoment } from "@/lib/types";

const BOOK_WIDTH = 177;
const BOOK_HEIGHT = Math.round(BOOK_WIDTH * 1.45);
const BOOK_FRAME_STYLE = { aspectRatio: `${BOOK_WIDTH} / ${BOOK_HEIGHT}` } as const;
const BOOK_IMAGE_SIZES = "(max-width: 639px) 33vw, 177px";
const BOOK_FRAME_CLASS =
  "relative w-full leading-none drop-shadow-[0_10px_28px_rgba(44,51,39,0.22)]";
const BOOK_TILE_CLASS = "floating-book-stage relative w-full max-w-[177px]";

const ROTATING_MOMENT_KINDS = [
  "before_question",
  "during_question",
  "association",
  "quote",
  "memorable_scene",
] as const;

const TEXT_COLORS = ["#4E6A53", "#3D5C45", "#C4783D", "#6B8F71", "#2C3327"] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickTextColor(seed: string) {
  return TEXT_COLORS[hashSeed(seed) % TEXT_COLORS.length];
}

function momentIsEligible(moment: CarouselMoment): boolean {
  if (moment.kind === "memorable_scene") {
    return !!moment.imageUrl?.trim();
  }
  return !!moment.text?.trim();
}

function pickRandomMoment(item: CarouselFeedItem): CarouselMoment | null {
  const buckets = new Map<(typeof ROTATING_MOMENT_KINDS)[number], CarouselMoment[]>();

  for (const kind of ROTATING_MOMENT_KINDS) {
    buckets.set(kind, []);
  }

  for (const moment of item.moments ?? []) {
    if (!ROTATING_MOMENT_KINDS.includes(moment.kind as (typeof ROTATING_MOMENT_KINDS)[number])) {
      continue;
    }
    if (!momentIsEligible(moment)) continue;
    buckets.get(moment.kind as (typeof ROTATING_MOMENT_KINDS)[number])!.push(moment);
  }

  const available = ROTATING_MOMENT_KINDS.map((kind) => buckets.get(kind)!).filter(
    (moments) => moments.length > 0
  );
  if (available.length === 0) return null;

  const pool = available[Math.floor(Math.random() * available.length)]!;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function animationDelay(index: number, itemId: string): number {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const jitter = (hashSeed(itemId) % 7) * 0.08;
  return col * 0.45 + row * 0.18 + jitter;
}

function BookVisual({
  item,
  moment,
  textColor,
}: {
  item: CarouselFeedItem;
  moment: CarouselMoment | null;
  textColor: string;
}) {
  const sceneImage =
    moment?.kind === "memorable_scene" && moment.imageUrl?.trim()
      ? moment.imageUrl.trim()
      : null;
  const textShadow =
    "0 0 6px rgba(255,255,255,0.95), 0 1px 2px rgba(255,255,255,0.85), 0 0 1px rgba(44,51,39,0.35)";

  function renderMomentOverlay() {
    if (sceneImage) {
      return (
        <div className="floating-book-caption pointer-events-none absolute inset-0 flex flex-col gap-1 p-2 pt-2.5">
          <p
            className="shrink-0 text-center text-[12px] font-medium leading-tight sm:text-[13px]"
            style={{ color: textColor, textShadow }}
          >
            기억에 남는 장면
          </p>
          <div className="relative min-h-0 flex-1">
            <Image
              src={sceneImage}
              alt="기억에 남는 장면"
              fill
              className="object-contain"
              sizes={BOOK_IMAGE_SIZES}
              unoptimized
            />
          </div>
        </div>
      );
    }

    if (!moment?.text) return null;

    return (
      <div className="floating-book-caption pointer-events-none absolute inset-0 flex items-center justify-center p-3">
        <p
          className="line-clamp-6 max-h-full overflow-hidden text-center text-[13px] font-medium leading-snug sm:text-[14px] sm:leading-relaxed"
          style={{ color: textColor, textShadow }}
        >
          {moment.text}
        </p>
      </div>
    );
  }

  if (item.coverUrl) {
    return (
      <div className={BOOK_FRAME_CLASS}>
        <Image
          src={item.coverUrl}
          alt={item.bookTitle}
          width={BOOK_WIDTH}
          height={BOOK_HEIGHT}
          className="floating-book-cover block h-auto w-full object-contain"
          sizes={BOOK_IMAGE_SIZES}
          unoptimized
        />
        <div className="floating-book-wash pointer-events-none absolute inset-0 bg-white" aria-hidden />
        {renderMomentOverlay()}
      </div>
    );
  }

  return (
    <div
      className={`floating-book-cover ${BOOK_FRAME_CLASS} flex flex-col items-center justify-center gap-1 px-2`}
      style={BOOK_FRAME_STYLE}
    >
      <BookOpen className={`${iconLg} text-koala-muted`} strokeWidth={1.5} aria-hidden />
      <span className="line-clamp-3 text-center text-xs font-medium text-koala-primary">
        {item.bookTitle}
      </span>
      <div className="floating-book-wash pointer-events-none absolute inset-0 bg-white" aria-hidden />
      {renderMomentOverlay()}
    </div>
  );
}

function FeedBookTile({
  item,
  index,
  onNavigate,
}: {
  item: CarouselFeedItem;
  index: number;
  onNavigate: () => void;
}) {
  const [moment, setMoment] = useState<CarouselMoment | null>(() => pickRandomMoment(item));
  const stageRef = useRef<HTMLDivElement>(null);
  const colorSeed = moment
    ? `${item.id}-${moment.text ?? moment.imageUrl ?? ""}`
    : item.id;
  const textColor = useMemo(() => pickTextColor(colorSeed), [colorSeed]);
  const delay = animationDelay(index, item.id);

  useEffect(() => {
    setMoment(pickRandomMoment(item));
  }, [item]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const cover = stage.querySelector(".floating-book-cover");
    if (!cover) return;

    function handleIteration(event: Event) {
      const animEvent = event as AnimationEvent;
      if (animEvent.animationName !== "floatingBookFade") return;
      setMoment(pickRandomMoment(item));
    }

    cover.addEventListener("animationiteration", handleIteration);
    return () => cover.removeEventListener("animationiteration", handleIteration);
  }, [item]);

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="floating-book-grid-tile flex w-full items-start justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-koala-primary/50"
      style={{ ["--book-anim-delay" as string]: `${delay}s` }}
      aria-label={`${item.username}의 ${item.bookTitle} 감상 보기`}
    >
      <div ref={stageRef} className={BOOK_TILE_CLASS}>
        <BookVisual item={item} moment={moment} textColor={textColor} />
        <span className="pointer-events-none absolute bottom-[calc(0.375rem+1em)] left-1.5 z-10 max-w-[calc(100%-12px)] truncate text-[12px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85),0_0_6px_rgba(0,0,0,0.45)] sm:text-[13px]">
          {item.username}
        </span>
      </div>
    </button>
  );
}

/** 1 … 4 5 [6] 7 8 … 20 처럼 처음·끝·현재 주변만 보여 준다 */
function buildPageNumbers(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

function FeedPagination({
  page,
  totalPages,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const arrowClass =
    "inline-flex size-9 items-center justify-center rounded-pill text-koala-muted hover:bg-koala-secondary/30 hover:text-koala-heading disabled:pointer-events-none disabled:opacity-30";

  return (
    <nav className="mt-2 flex flex-wrap items-center justify-center gap-1" aria-label="쪽 번호">
      <button
        type="button"
        className={arrowClass}
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="이전 쪽"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {buildPageNumbers(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-koala-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`inline-flex size-9 items-center justify-center rounded-pill text-sm transition ${
              p === page
                ? "bg-koala-primary font-semibold text-white"
                : "text-koala-text hover:bg-koala-secondary/30"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className={arrowClass}
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="다음 쪽"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}

export function FriendFeedMosaic() {
  const router = useRouter();
  const { user, isLoading: authLoading, refresh } = useAuth();
  const [items, setItems] = useState<CarouselFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);

  const loadFeed = useCallback((nextPage: number) => {
    return fetch(`/api/feed/carousel?page=${nextPage}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setPage(d.page ?? nextPage);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadFeed(1).finally(() => setLoading(false));
  }, [user, authLoading, loadFeed]);

  const changePage = useCallback(
    (nextPage: number) => {
      setPageLoading(true);
      void loadFeed(nextPage).finally(() => {
        setPageLoading(false);
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [loadFeed]
  );

  const handleLoginSuccess = useCallback(async () => {
    await refresh();
    router.refresh();
  }, [refresh, router]);

  if (authLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-koala-muted">불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <section className="flex min-h-[420px] items-center justify-center py-8">
        <LoginForm onSuccess={handleLoginSuccess} />
      </section>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-koala-muted">친구들의 기록을 불러오는 중...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="koala-card flex h-[320px] flex-col items-center justify-center p-8 text-center">
        <p className="text-koala-muted">아직 공유된 감상이 없어요.</p>
        <p className="mt-2 text-sm text-koala-muted">책을 읽고 첫 기록을 남겨 보세요.</p>
      </div>
    );
  }

  return (
    <section ref={sectionRef} className="scroll-mt-20">
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-3 sm:px-6">
        <div className="mx-auto max-w-6xl px-2 py-6 sm:px-4 sm:py-8">
          <div
            className={`grid grid-cols-3 gap-x-3 gap-y-8 transition-opacity sm:grid-cols-4 sm:gap-x-6 sm:gap-y-10 ${
              pageLoading ? "opacity-40" : ""
            }`}
            aria-busy={pageLoading}
          >
            {items.map((item, index) => (
              <FeedBookTile
                key={item.id}
                item={item}
                index={index}
                onNavigate={() => router.push(`/story/${item.id}`)}
              />
            ))}
          </div>
          <FeedPagination
            page={page}
            totalPages={totalPages}
            disabled={pageLoading}
            onChange={changePage}
          />
        </div>
      </div>
    </section>
  );
}
