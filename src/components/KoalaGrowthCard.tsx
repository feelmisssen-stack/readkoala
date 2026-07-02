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
    <div className="koala-card-status relative flex h-full flex-col overflow-hidden p-4 transition hover:bg-koala-secondary/40">
      <div className="flex min-h-28 flex-1 items-center gap-5">
        <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-koala border border-koala-accent/35 bg-koala-card">
          <KoalaGrowthIllustration visualTier={growth.visualTier} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col pl-2">
          <div className={growth.stageLevel === 1 ? "text-right" : ""}>
            <p className="text-[11px] font-semibold leading-snug text-koala-accent">
              Lv. {growth.stageLevel}
            </p>
            <h2 className="truncate font-bold text-koala-heading">{growth.stageName}</h2>
            <div className="mt-0.5 text-[11px] leading-snug text-koala-muted">
              {splitStageDescription(growth.stageDescription).map((line, index) => (
                <p key={index} className={index > 0 ? "mt-0.5" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-2 w-full space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] leading-snug text-koala-muted">성장 단계</span>
              <span className="shrink-0 text-xs font-medium text-koala-primary">
                {growth.stageLevel} / {growth.stageCount}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-pill bg-koala-secondary/30">
              <div
                className="h-full rounded-pill bg-koala-accent transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-right text-[10px] text-koala-muted">{growth.leafCount} 잎새</p>
          </div>
        </div>
      </div>
    </div>
  );
}
