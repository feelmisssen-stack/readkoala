"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { iconLg } from "@/lib/icon-styles";
import type { CarouselFeedItem, CarouselMoment } from "@/lib/types";

const SLIDE_INTERVAL_MS = 3000;

/** 4열 그리드 — 가로 최대 1/4, 세로 최소 3행 이상 */
const TILE_PATTERNS = [
  "col-span-1 row-span-3",
  "col-span-1 row-span-5",
  "col-span-1 row-span-4",
  "col-span-1 row-span-3",
  "col-span-1 row-span-6",
  "col-span-1 row-span-4",
  "col-span-1 row-span-5",
  "col-span-1 row-span-3",
  "col-span-1 row-span-6",
  "col-span-1 row-span-4",
  "col-span-1 row-span-5",
  "col-span-1 row-span-4",
];

const TILE_RADII = [12, 16, 14, 18, 13, 17, 15, 20, 12, 19, 14, 16];
const GRID_ROW_PX = 50;
const MIN_TILE_ROWS = 3;

const MEMO_COLOR_PALETTE = [
  { text: "#4E6A53", bg: "#FFFFFF" },
  { text: "#5F7A64", bg: "#F6F8F4" },
  { text: "#3D5C45", bg: "#FAFCF9" },
  { text: "#C4783D", bg: "#FFFAF4" },
  { text: "#B86E35", bg: "#FFF8F0" },
  { text: "#6B8F71", bg: "#F2F6F0" },
  { text: "#7A8F6E", bg: "#F8FAF6" },
  { text: "#8B6B4A", bg: "#FBF7F2" },
  { text: "#4A6350", bg: "#EFF3EE" },
  { text: "#717D6A", bg: "#FFFFFF" },
  { text: "#2C3327", bg: "#F9F8F5" },
  { text: "#5C6B52", bg: "#F5F7F3" },
] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickMemoColors(seed: string) {
  return MEMO_COLOR_PALETTE[hashSeed(seed) % MEMO_COLOR_PALETTE.length];
}

function getTileVariation(itemId: string) {
  const hash = hashSeed(itemId);
  const scatter = hash % 3;
  // 타일마다 겹침·분리·보통 간격을 섞어 모자이크 느낌
  const margin = scatter === 0 ? -6 : scatter === 1 ? 8 : 0;

  return {
    margin,
    offsetX: ((hash % 7) - 3) * 4,
    offsetY: (((hash >> 4) % 7) - 3) * 5,
    radius: TILE_RADII[hash % TILE_RADII.length],
    zIndex: 10 + (hash % 8),
  };
}

function TileBookFooter({ username, bookTitle }: { username: string; bookTitle: string }) {
  return (
    <div className="mt-auto shrink-0 p-2 text-left">
      <p className="truncate text-[10px] text-koala-muted sm:text-xs">{username}</p>
      <p className="truncate text-xs font-medium text-koala-primary sm:text-sm">{bookTitle}</p>
    </div>
  );
}

function MosaicMomentContent({
  moment,
  colorSeed,
}: {
  moment: CarouselMoment;
  colorSeed: string;
}) {
  const colors = useMemo(() => pickMemoColors(colorSeed), [colorSeed]);

  if (moment.kind === "memorable_scene" && moment.imageUrl) {
    return (
      <div className="relative h-full w-full max-h-full max-w-full">
        <Image
          src={moment.imageUrl}
          alt="기억에 남는 장면"
          fill
          className="object-contain"
          sizes="(max-width:768px) 25vw, 180px"
          unoptimized
        />
      </div>
    );
  }

  if (!moment.text) return null;

  return (
    <p
      className="line-clamp-5 px-1 text-center text-[11px] font-medium leading-snug sm:line-clamp-6 sm:text-xs sm:leading-relaxed"
      style={{ color: colors.text }}
    >
      {moment.text}
    </p>
  );
}

export function FriendFeedMosaic() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined);
  const [items, setItems] = useState<CarouselFeedItem[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [slideIndices, setSlideIndices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(() => {
    setLoading(true);
    return fetch("/api/feed/carousel")
      .then((r) => r.json())
      .then((d) => {
        const list: CarouselFeedItem[] = d.items || [];
        setItems(list);
        if (list.length > 0) setFocusedId(list[0].id);
        const initial: Record<string, number> = {};
        for (const item of list) {
          if (item.moments.length > 0) {
            initial[item.id] = Math.floor(Math.random() * (1 + item.moments.length));
          }
        }
        setSlideIndices(initial);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadFeed();
  }, [user, loadFeed]);

  const handleLoginSuccess = useCallback(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        window.dispatchEvent(new Event("auth-changed"));
        router.refresh();
      });
  }, [router]);

  useEffect(() => {
    if (items.length === 0) return;

    const timer = setInterval(() => {
      setSlideIndices((prev) => {
        const next = { ...prev };
        for (const item of items) {
          if (item.moments.length === 0) continue;
          const slideCount = 1 + item.moments.length;
          next[item.id] = ((prev[item.id] ?? 0) + 1) % slideCount;
        }
        return next;
      });
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [items]);

  const getTileState = useCallback((item: CarouselFeedItem, itemSlideIndex: number) => {
    if (item.moments.length === 0) return { mode: "cover" as const };
    if (itemSlideIndex === 0) return { mode: "cover" as const };
    const moment = item.moments[itemSlideIndex - 1];
    return moment ? { mode: "moment" as const, moment } : { mode: "cover" as const };
  }, []);

  if (user === undefined) {
    return (
      <div className="flex h-[520px] items-center justify-center">
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
      <div className="flex h-[520px] items-center justify-center">
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

  const displayItems = items.slice(0, Math.max(items.length, 8));

  return (
    <section>
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-3 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-visible px-2 py-6 sm:px-4 sm:py-8">
          <div
            className="grid grid-cols-4 gap-3 sm:gap-4"
            style={{
              gridAutoFlow: "dense",
              gridAutoRows: `${GRID_ROW_PX}px`,
            }}
          >
            {displayItems.map((item) => {
              const itemSlide = slideIndices[item.id] ?? 0;
              const state = getTileState(item, itemSlide);
              const isFocused = item.id === focusedId;
              const pattern = TILE_PATTERNS[hashSeed(item.id) % TILE_PATTERNS.length];
              const { margin, offsetX, offsetY, radius, zIndex } = getTileVariation(item.id);
              const momentColorSeed =
                state.mode === "moment"
                  ? `${item.id}-${itemSlide}-${state.moment.text ?? state.moment.imageUrl ?? ""}`
                  : "";
              const momentBg =
                state.mode === "moment" ? pickMemoColors(momentColorSeed).bg : undefined;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/story/${item.id}`)}
                  className={`relative transition-all duration-500 ${pattern}`}
                  style={{
                    margin,
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    borderRadius: radius,
                    zIndex: isFocused ? 30 : zIndex,
                    minHeight: GRID_ROW_PX * MIN_TILE_ROWS,
                  }}
                >
                  <div
                    className={`absolute inset-0 overflow-hidden border transition-all duration-500 ${
                      isFocused
                        ? "border-koala-primary/40 shadow-lg"
                        : state.mode === "moment"
                          ? "border-transparent shadow-md"
                          : "border-koala-secondary/25 shadow-sm"
                    }`}
                    style={{
                      borderRadius: radius,
                      backgroundColor: momentBg,
                      boxShadow:
                        state.mode === "moment"
                          ? "2px 6px 18px rgba(44, 51, 39, 0.12)"
                          : undefined,
                    }}
                  >
                    {state.mode === "cover" ? (
                      <>
                        <div className="absolute inset-0 bg-koala-secondary/15">
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
                            <div className="flex h-full flex-col items-center justify-center gap-1 bg-koala-secondary/25 p-2">
                              <BookOpen
                                className={`${iconLg} text-koala-muted`}
                                strokeWidth={1.5}
                                aria-hidden
                              />
                              <span className="line-clamp-2 text-center text-[10px] font-medium text-koala-primary sm:text-xs">
                                {item.bookTitle}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                          <p className="truncate text-[10px] text-white/80 sm:text-xs">{item.username}</p>
                          <p className="truncate text-xs font-medium text-white sm:text-sm">
                            {item.bookTitle}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div
                        className="absolute inset-0 flex flex-col transition-colors duration-500"
                        style={{ backgroundColor: momentBg }}
                      >
                        <div className="flex min-h-0 flex-1 items-center justify-center px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
                          <MosaicMomentContent moment={state.moment} colorSeed={momentColorSeed} />
                        </div>
                        <TileBookFooter username={item.username} bookTitle={item.bookTitle} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
