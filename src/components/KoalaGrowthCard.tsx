"use client";

import { KoalaGrowthIllustration } from "@/components/KoalaGrowthIllustration";
import { splitStageDescription } from "@/lib/writing-growth";
import type { WritingGrowth } from "@/lib/writing-growth";

interface KoalaGrowthCardProps {
  growth: WritingGrowth;
}

export function KoalaGrowthCard({ growth }: KoalaGrowthCardProps) {
  const progressPercent = ((growth.stageIndex + 1) / growth.stageCount) * 100;

  return (
    <div className="koala-card-status relative flex h-full min-w-0 flex-col transition">
      <div className="koala-card-status-inner flex min-h-0 flex-1 items-center gap-3 sm:min-h-28 sm:gap-5">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-koala border border-koala-secondary/60 bg-koala-surface-soft sm:h-32 sm:w-28">
          <KoalaGrowthIllustration visualTier={growth.visualTier} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col pl-1 sm:pl-2">
          <div className={growth.stageLevel === 1 ? "text-right" : ""}>
            <p className="text-xs font-semibold leading-snug">
              <span className="text-koala-primary-active">성장 기록</span>
              <span className="mx-1 font-normal text-koala-text/80">·</span>
              <span className="text-koala-heading">Lv. {growth.stageLevel}</span>
            </p>
            <h2 className="truncate text-base font-semibold text-koala-heading">{growth.stageName}</h2>
            <div className="mt-1 text-xs leading-snug text-koala-text">
              {splitStageDescription(growth.stageDescription).map((line, index) => (
                <p key={index} className={index > 0 ? "mt-0.5" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-2 w-full space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs leading-snug text-koala-text">성장 단계</span>
              <span className="shrink-0 text-sm font-semibold text-koala-primary-active">
                {growth.stageLevel} / {growth.stageCount}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-pill bg-koala-secondary/55">
              <div
                className="h-full rounded-pill bg-koala-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-right text-xs font-medium text-koala-muted">{growth.leafCount} 잎새</p>
          </div>
        </div>
      </div>
    </div>
  );
}
