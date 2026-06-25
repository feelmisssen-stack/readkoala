"use client";

import { KoalaGrowthIllustration } from "@/components/KoalaGrowthIllustration";
import type { WritingGrowth } from "@/lib/writing-growth";

interface KoalaGrowthCardProps {
  growth: WritingGrowth;
}

export function KoalaGrowthCard({ growth }: KoalaGrowthCardProps) {
  const progressPercent = ((growth.stageIndex + 1) / growth.stageCount) * 100;

  return (
    <div className="koala-card flex h-full flex-col overflow-hidden p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
        <KoalaGrowthIllustration visualTier={growth.visualTier} className="h-28 w-full max-w-[9rem]" />
        <p className="text-center text-xs font-semibold text-koala-accent">Lv. {growth.stageLevel}</p>
        <p className="text-center text-sm font-bold leading-snug text-koala-primary">{growth.stageName}</p>
        <p className="line-clamp-3 text-center text-xs leading-relaxed text-koala-muted">
          {growth.stageDescription}
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="h-2 overflow-hidden rounded-pill bg-koala-secondary/25">
          <div
            className="h-full rounded-pill bg-koala-accent transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-right text-xs font-medium text-koala-muted">{growth.leafCount} 잎새</p>
      </div>
    </div>
  );
}
