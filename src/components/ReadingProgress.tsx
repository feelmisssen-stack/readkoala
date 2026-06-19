"use client";

import { useEffect, useState } from "react";
import {
  calcProgressFromPages,
  getBarPercent,
  getReadingStatus,
  getReadingStatusLabel,
} from "@/lib/reading-progress";

interface ReadingProgressProps {
  readingProgress: number;
  currentPage: number;
  totalPages?: number;
  fetchingTotalPages?: boolean;
  onCurrentPageCommit: (page: number) => void;
  onTotalPagesCommit?: (pages: number) => void;
  saving?: boolean;
}

export function ReadingProgress({
  readingProgress,
  currentPage,
  totalPages,
  fetchingTotalPages,
  onCurrentPageCommit,
  onTotalPagesCommit,
  saving,
}: ReadingProgressProps) {
  const [currentDraft, setCurrentDraft] = useState(String(currentPage || ""));
  const [totalDraft, setTotalDraft] = useState(totalPages ? String(totalPages) : "");

  useEffect(() => {
    setCurrentDraft(currentPage > 0 ? String(currentPage) : "");
  }, [currentPage]);

  useEffect(() => {
    setTotalDraft(totalPages && totalPages > 0 ? String(totalPages) : "");
  }, [totalPages]);

  const status = getReadingStatus(readingProgress, currentPage, totalPages);
  const statusLabel = getReadingStatusLabel(status);
  const barPercent = getBarPercent(readingProgress, currentPage, totalPages);
  const hasTotal = Boolean(totalPages && totalPages > 0);

  function commitCurrentPage() {
    const parsed = Math.max(0, parseInt(currentDraft, 10) || 0);
    const capped = hasTotal ? Math.min(parsed, totalPages!) : parsed;
    setCurrentDraft(capped > 0 ? String(capped) : "");
    onCurrentPageCommit(capped);
  }

  function commitTotalPages() {
    if (!onTotalPagesCommit) return;
    const parsed = Math.max(0, parseInt(totalDraft, 10) || 0);
    if (parsed <= 0) return;
    setTotalDraft(String(parsed));
    onTotalPagesCommit(parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent, commit: () => void) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-koala-primary">{statusLabel}</span>
        {hasTotal && (
          <span className="text-xs text-koala-muted">
            {Math.min(currentPage, totalPages!)} / {totalPages}쪽
          </span>
        )}
      </div>

      <div className="relative h-3 overflow-hidden rounded-pill bg-koala-secondary/30">
        <div
          className="h-full rounded-pill bg-koala-primary transition-all duration-500"
          style={{ width: `${barPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[120px] flex-1">
          <label className="koala-label text-xs">읽은 페이지</label>
          <input
            type="number"
            min={0}
            max={hasTotal ? totalPages : undefined}
            value={currentDraft}
            placeholder="0"
            onChange={(e) => setCurrentDraft(e.target.value)}
            onBlur={commitCurrentPage}
            onKeyDown={(e) => handleKeyDown(e, commitCurrentPage)}
            className="koala-input py-2 text-sm"
          />
        </div>

        {fetchingTotalPages ? (
          <p className="pb-2 text-xs text-koala-muted">총 페이지 불러오는 중...</p>
        ) : hasTotal ? (
          <p className="pb-2 text-xs text-koala-muted">총 {totalPages}쪽</p>
        ) : onTotalPagesCommit ? (
          <div className="min-w-[120px] flex-1">
            <label className="koala-label text-xs">총 페이지 (직접 입력)</label>
            <input
              type="number"
              min={1}
              value={totalDraft}
              placeholder="예: 120"
              onChange={(e) => setTotalDraft(e.target.value)}
              onBlur={commitTotalPages}
              onKeyDown={(e) => handleKeyDown(e, commitTotalPages)}
              className="koala-input py-2 text-sm"
            />
            <p className="mt-1 text-xs text-koala-muted">Enter 또는 다른 곳을 누르면 저장돼요</p>
          </div>
        ) : (
          <p className="pb-2 text-xs text-koala-muted">총 페이지 정보를 찾지 못했어요</p>
        )}
      </div>

      {hasTotal && currentPage > 0 && (
        <p className="text-xs text-koala-muted">
          {calcProgressFromPages(currentPage, totalPages)}% 읽었어요
        </p>
      )}

      {saving && <p className="text-xs text-koala-muted">저장 중...</p>}
    </div>
  );
}
