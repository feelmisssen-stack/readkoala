"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { MAX_HEART_COUNT } from "@/lib/empathy";

interface EmpathyState {
  totalHearts: number;
  myHeartCount: number;
  canVote: boolean;
  isOwnStory: boolean;
  voterCount: number;
}

interface StoryEmpathyPanelProps {
  bookId: string;
  storyId?: string;
}

function HeartRow({
  count,
  interactive,
  disabled,
  onSelect,
}: {
  count: number;
  interactive?: boolean;
  disabled?: boolean;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: MAX_HEART_COUNT }, (_, index) => {
        const filled = index < count;
        const heart = (
          <Heart
            className={`size-6 transition-colors ${
              filled
                ? "fill-koala-accent text-koala-accent"
                : "fill-transparent text-koala-accent/35"
            }`}
            strokeWidth={1.75}
            aria-hidden
          />
        );

        if (!interactive) {
          return (
            <span key={index} className="inline-flex">
              {heart}
            </span>
          );
        }

        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            aria-label={`공감 ${index + 1}개`}
            onClick={() => onSelect?.(index)}
            className="inline-flex rounded-full p-0.5 transition hover:scale-105 disabled:opacity-60"
          >
            {heart}
          </button>
        );
      })}
    </div>
  );
}

function ReceivedHeartsSummary({ totalHearts, voterCount }: { totalHearts: number; voterCount: number }) {
  return (
    <div className="px-1 py-1 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <HeartRow count={totalHearts > 0 ? MAX_HEART_COUNT : 0} />
        <span
          className={`min-w-[1.25rem] text-base font-bold tabular-nums ${
            totalHearts > 0 ? "text-koala-accent" : "text-koala-muted"
          }`}
        >
          {totalHearts}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-koala-muted">
        {totalHearts > 0 ? `${voterCount}명이 공감했어요` : "아직 공감이 없어요"}
      </p>
    </div>
  );
}

export function StoryEmpathyPanel({ bookId, storyId }: StoryEmpathyPanelProps) {
  const [state, setState] = useState<EmpathyState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/books/${encodeURIComponent(bookId)}/empathy`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setState(data);
      })
      .catch(() => setError("공감 정보를 불러오지 못했어요."));
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectHeart(index: number) {
    if (!state?.canVote || saving) return;

    const clicked = index + 1;
    const nextHeartCount = state.myHeartCount === clicked ? 0 : clicked;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/empathy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heartCount: nextHeartCount,
          storyId: storyId ?? `book-${bookId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "공감을 저장하지 못했어요.");
        return;
      }
      setState(data);
    } catch {
      setError("공감을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  if (!state) {
    return <div className="px-1 py-1 text-xs text-koala-muted">불러오는 중...</div>;
  }

  if (state.isOwnStory) {
    return <ReceivedHeartsSummary totalHearts={state.totalHearts} voterCount={state.voterCount} />;
  }

  if (!state.canVote) {
    return (
      <div className="px-1 py-1 text-right">
        <HeartRow count={0} />
        <Link href="/" className="mt-1 block text-[11px] text-koala-accent underline">
          로그인하고 공감하기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-1 py-1 text-right">
      <HeartRow
        count={state.myHeartCount}
        interactive
        disabled={saving}
        onSelect={(index) => void selectHeart(index)}
      />
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
