"use client";

import { useEffect, useRef, useState } from "react";
import {
  calcProgressFromPages,
  getBarPercent,
  getReadingStatus,
} from "@/lib/reading-progress";
import {
  buildReadingStatusDisplay,
  resolveReadingDisplayDates,
} from "@/lib/reading-dates";

interface ReadingProgressProps {
  readingProgress: number;
  currentPage: number;
  totalPages?: number;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
  fetchingTotalPages?: boolean;
  onCurrentPageCommit: (page: number) => void;
  onTotalPagesCommit?: (pages: number) => void;
  saving?: boolean;
  compact?: boolean;
}

export function ReadingProgress({
  readingProgress,
  currentPage,
  totalPages,
  createdAt,
  updatedAt,
  finishedAt,
  fetchingTotalPages,
  onCurrentPageCommit,
  onTotalPagesCommit,
  saving,
  compact = false,
}: ReadingProgressProps) {
  const [currentDraft, setCurrentDraft] = useState(String(currentPage || ""));
  const [totalDraft, setTotalDraft] = useState(totalPages ? String(totalPages) : "");
  const currentDirtyRef = useRef(false);
  const totalDirtyRef = useRef(false);

  useEffect(() => {
    setCurrentDraft(currentPage > 0 ? String(currentPage) : "");
    currentDirtyRef.current = false;
  }, [currentPage]);

  useEffect(() => {
    setTotalDraft(totalPages && totalPages > 0 ? String(totalPages) : "");
    totalDirtyRef.current = false;
  }, [totalPages]);

  const status = getReadingStatus(readingProgress, currentPage, totalPages);
  const { startedAt, finishedAt: resolvedFinishedAt } = resolveReadingDisplayDates({
    readingProgress,
    currentPage,
    totalPages,
    finishedAt,
    createdAt: createdAt ?? "",
    updatedAt: updatedAt ?? createdAt ?? "",
  });
  const display = buildReadingStatusDisplay(status, startedAt, resolvedFinishedAt);
  const barPercent = getBarPercent(readingProgress, currentPage, totalPages);
  const hasTotal = Boolean(totalPages && totalPages > 0);

  function parseCurrentDraft(draft: string) {
    const parsed = Math.max(0, parseInt(draft, 10) || 0);
    return hasTotal ? Math.min(parsed, totalPages!) : parsed;
  }

  function commitCurrentPage() {
    const capped = parseCurrentDraft(currentDraft);
    if (capped === currentPage) {
      setCurrentDraft(capped > 0 ? String(capped) : "");
      currentDirtyRef.current = false;
      return;
    }
    setCurrentDraft(capped > 0 ? String(capped) : "");
    currentDirtyRef.current = false;
    onCurrentPageCommit(capped);
  }

  function commitTotalPages() {
    if (!onTotalPagesCommit) return;
    const parsed = Math.max(0, parseInt(totalDraft, 10) || 0);
    if (parsed <= 0) return;
    if (parsed === totalPages) {
      setTotalDraft(String(parsed));
      totalDirtyRef.current = false;
      return;
    }
    setTotalDraft(String(parsed));
    totalDirtyRef.current = false;
    onTotalPagesCommit(parsed);
  }

  useEffect(() => {
    if (!compact || !currentDirtyRef.current || currentDraft.trim() === "") return;

    const timer = window.setTimeout(() => {
      if (!currentDirtyRef.current) return;
      commitCurrentPage();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [compact, currentDraft, currentPage, hasTotal, totalPages]);

  useEffect(() => {
    if (!compact || !onTotalPagesCommit || !totalDirtyRef.current || totalDraft.trim() === "") return;

    const timer = window.setTimeout(() => {
      if (!totalDirtyRef.current) return;
      commitTotalPages();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [compact, totalDraft, totalPages, onTotalPagesCommit]);

  function handleKeyDown(e: React.KeyboardEvent, commit: () => void) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className={`w-full ${compact ? "space-y-2" : "space-y-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex min-w-0 flex-wrap items-center gap-1 ${
            compact ? "text-[11px] leading-snug" : "gap-1.5 text-sm"
          }`}
        >
          {display.prefix && <span className="text-koala-muted">{display.prefix}</span>}
          <span className="font-medium text-koala-primary">{display.label}</span>
          {display.suffix && <span className="text-koala-muted">{display.suffix}</span>}
        </div>
        {hasTotal && (
          <span
            className={`shrink-0 font-medium text-koala-primary ${
              compact ? "text-xs" : "text-xs"
            }`}
          >
            {Math.min(currentPage, totalPages!)} / {totalPages}쪽
          </span>
        )}
      </div>

      <div
        className={`relative overflow-hidden rounded-pill bg-koala-secondary/30 ${
          compact ? "h-2" : "h-3"
        }`}
      >
        <div
          className="h-full rounded-pill bg-koala-primary transition-all duration-500"
          style={{ width: `${barPercent}%` }}
        />
      </div>

      <div className={`flex flex-wrap items-end ${compact ? "gap-2" : "gap-3"}`}>
        <div className={compact ? "min-w-0 flex-1" : "min-w-[120px] flex-1"}>
          {!compact && <label className="koala-label text-xs">읽은 페이지</label>}
          <input
            type="number"
            min={0}
            max={hasTotal ? totalPages : undefined}
            value={currentDraft}
            placeholder={compact ? "읽은 쪽" : "0"}
            onChange={(e) => {
              currentDirtyRef.current = true;
              setCurrentDraft(e.target.value);
            }}
            onBlur={commitCurrentPage}
            onKeyDown={(e) => handleKeyDown(e, commitCurrentPage)}
            className={`koala-input w-full ${compact ? "py-1.5 text-xs" : "py-2 text-sm"}`}
          />
        </div>

        {fetchingTotalPages ? (
          <p className={`text-koala-muted ${compact ? "pb-1 text-[10px]" : "pb-2 text-xs"}`}>
            불러오는 중...
          </p>
        ) : hasTotal ? (
          <p className={`text-koala-muted ${compact ? "pb-1 text-[10px]" : "pb-2 text-xs"}`}>
            총 {totalPages}쪽
          </p>
        ) : onTotalPagesCommit ? (
          <div className={compact ? "min-w-0 flex-1" : "min-w-[120px] flex-1"}>
            {!compact && <label className="koala-label text-xs">총 페이지 (직접 입력)</label>}
            <input
              type="number"
              min={1}
              value={totalDraft}
              placeholder={compact ? "총 쪽" : "예: 120"}
              onChange={(e) => {
                totalDirtyRef.current = true;
                setTotalDraft(e.target.value);
              }}
              onBlur={commitTotalPages}
              onKeyDown={(e) => handleKeyDown(e, commitTotalPages)}
              className={`koala-input w-full ${compact ? "py-1.5 text-xs" : "py-2 text-sm"}`}
            />
            {!compact && (
              <p className="mt-1 text-xs text-koala-muted">Enter 또는 다른 곳을 누르면 저장돼요</p>
            )}
          </div>
        ) : (
          <p className={`text-koala-muted ${compact ? "pb-1 text-[10px]" : "pb-2 text-xs"}`}>
            총 페이지 없음
          </p>
        )}
      </div>

      {hasTotal && currentPage > 0 && (
        <p className={`text-koala-muted ${compact ? "text-[10px]" : "text-xs"}`}>
          {calcProgressFromPages(currentPage, totalPages)}% 읽었어요
        </p>
      )}

      {saving && (
        <p className={`text-koala-muted ${compact ? "text-[10px]" : "text-xs"}`}>저장 중...</p>
      )}
    </div>
  );
}
