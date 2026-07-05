"use client";

import { Eye } from "lucide-react";

export function ReadOnlyBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <Eye className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span>
          뷰어계정이에요. 화면은 둘러볼 수 있지만 저장·등록·수정·삭제는 할 수 없어요.
        </span>
      </p>
    </div>
  );
}
