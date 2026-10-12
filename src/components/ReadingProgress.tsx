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
  const [editingTotal, setEditingTotal] = useState(false);
  const currentDirtyRef = useRef(false);
  const totalDirtyRef = useRef(false);
  const totalCancelledRef = useRef(false);

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
  const showTotalInput = Boolean(onTotalPagesCommit) && (!hasTotal || editingTotal);

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

  function startEditingTotal() {
    setTotalDraft(totalPages ? String(totalPages) : "");
    totalDirtyRef.current = false;
    totalCancelledRef.current = false;
    setEditingTotal(true);
  }

  function cancelEditingTotal() {
    setTotalDraft(totalPages ? String(totalPages) : "");
    totalDirtyRef.current = false;
    setEditingTotal(false);
  }

  function commitTotalPages() {
    if (!onTotalPagesCommit) return;
    const parsed = Math.max(0, parseInt(totalDraft, 10) || 0);
    if (parsed <= 0) {
      if (editingTotal) cancelEditingTotal();
      return;
    }
    setEditingTotal(false);
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
    // 고치는 중에는 "120"을 치다 "1"에서 멈춰도 저장되지 않도록 Enter·바깥 누르기로만 저장한다
    if (!compact || editingTotal || !onTotalPagesCommit || !totalDirtyRef.current || totalDraft.trim() === "") return;

    const timer = window.setTimeout(() => {
      if (!totalDirtyRef.current) return;
      commitTotalPages();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [compact, editingTotal, totalDraft, totalPages, onTotalPagesCommit]);

  function handleKeyDown(e: React.KeyboardEvent, commit: () => void) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleTotalKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && editingTotal) {
      e.preventDefault();
      totalCancelledRef.current = true;
      cancelEditingTotal();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleTotalBlur() {
    if (totalCancelledRef.current) {
      totalCancelledRef.current = false;
      return;
    }
    commitTotalPages();
  }

  const totalEditButtonClass =
    "rounded-koala-btn underline decoration-dotted underline-offset-2 hover:text-koala-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-koala-primary/40";

  const pageInputClass = compact
    ? "h-7 w-[3.25rem] rounded-koala-btn border border-koala-secondary bg-koala-bg pl-1.5 pr-2 text-right text-xs text-koala-heading focus:outline-none focus:border-koala-primary"
    : "koala-input w-full py-2 text-sm";

  const compactPageControls = (
    <div className="flex shrink-0 items-center gap-1 text-xs">
      {fetchingTotalPages ? (
        <span className="text-koala-muted">불러오는 중...</span>
      ) : (
        <>
          <input
            type="number"
            min={0}
            max={hasTotal ? totalPages : undefined}
            value={currentDraft}
            placeholder="0"
            aria-label="읽은 페이지"
            onChange={(e) => {
              currentDirtyRef.current = true;
              setCurrentDraft(e.target.value);
            }}
            onBlur={commitCurrentPage}
            onKeyDown={(e) => handleKeyDown(e, commitCurrentPage)}
            className={pageInputClass}
          />
          {showTotalInput ? (
            <>
              <span className="text-koala-muted">/</span>
              <input
                type="number"
                min={1}
                value={totalDraft}
                placeholder="총"
                aria-label="총 페이지"
                autoFocus={editingTotal}
                onChange={(e) => {
                  totalDirtyRef.current = true;
                  setTotalDraft(e.target.value);
                }}
                onBlur={handleTotalBlur}
                onKeyDown={handleTotalKeyDown}
                className={pageInputClass}
              />
              <span className="text-koala-muted">쪽</span>
            </>
          ) : hasTotal && onTotalPagesCommit ? (
            <button
              type="button"
              onClick={startEditingTotal}
              title="눌러서 전체 쪽수 고치기"
              aria-label={`전체 ${totalPages}쪽, 눌러서 고치기`}
              className={`font-medium text-koala-primary ${totalEditButtonClass}`}
            >
              / {totalPages}쪽
            </button>
          ) : hasTotal ? (
            <span className="font-medium text-koala-primary">/ {totalPages}쪽</span>
          ) : (
            <span className="text-koala-muted">쪽</span>
          )}
        </>
      )}
    </div>
  );

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
        {compact ? (
          compactPageControls
        ) : (
          hasTotal && (
            <span className="shrink-0 text-xs font-medium text-koala-primary">
              {Math.min(currentPage, totalPages!)} / {totalPages}쪽
            </span>
          )
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

      {!compact && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[120px] flex-1">
            <label className="koala-label text-xs">읽은 페이지</label>
            <input
              type="number"
              min={0}
              max={hasTotal ? totalPages : undefined}
              value={currentDraft}
              placeholder="0"
              onChange={(e) => {
                currentDirtyRef.current = true;
                setCurrentDraft(e.target.value);
              }}
              onBlur={commitCurrentPage}
              onKeyDown={(e) => handleKeyDown(e, commitCurrentPage)}
              className={pageInputClass}
            />
          </div>

          {fetchingTotalPages ? (
            <p className="pb-2 text-xs text-koala-muted">불러오는 중...</p>
          ) : showTotalInput ? (
            <div className="min-w-[120px] flex-1">
              <label className="koala-label text-xs">
                {editingTotal ? "총 페이지 고치기" : "총 페이지 (직접 입력)"}
              </label>
              <input
                type="number"
                min={1}
                value={totalDraft}
                placeholder="예: 120"
                autoFocus={editingTotal}
                onChange={(e) => {
                  totalDirtyRef.current = true;
                  setTotalDraft(e.target.value);
                }}
                onBlur={handleTotalBlur}
                onKeyDown={handleTotalKeyDown}
                className={pageInputClass}
              />
              <p className="mt-1 text-xs text-koala-muted">
                {editingTotal
                  ? "Enter 또는 다른 곳을 누르면 저장돼요 (Esc: 취소)"
                  : "Enter 또는 다른 곳을 누르면 저장돼요"}
              </p>
            </div>
          ) : hasTotal ? (
            <p className="pb-2 text-xs text-koala-muted">
              총 {totalPages}쪽
              {onTotalPagesCommit && (
                <button
                  type="button"
                  onClick={startEditingTotal}
                  className={`ml-2 text-koala-primary ${totalEditButtonClass}`}
                >
                  고치기
                </button>
              )}
            </p>
          ) : (
            <p className="pb-2 text-xs text-koala-muted">총 페이지 없음</p>
          )}
        </div>
      )}

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
