"use client";

import { KoalaGrowthIllustration } from "@/components/KoalaGrowthIllustration";
import { splitStageDescription } from "@/lib/writing-growth";
import type { WritingGrowth } from "@/lib/writing-growth";

interface KoalaGrowthCardProps {
  growth: WritingGrowth;
}

export function KoalaGrowthCard({ growth }: KoalaGrowthCardProps) {
  return (
    <div className="relative flex h-full min-w-0 flex-col pl-3 sm:pl-4">
      <div className="flex min-h-0 flex-1 items-center gap-3 sm:min-h-28 sm:gap-4">
        <div className="relative h-24 w-20 shrink-0 sm:h-32 sm:w-28">
          <KoalaGrowthIllustration visualTier={growth.visualTier} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col pl-1 sm:pl-2">
          <div className="w-full min-w-0">
            <div className="flex w-full items-center gap-2 pr-3">
              <span className="shrink-0 text-base font-semibold text-koala-heading">
                Lv. {growth.stageLevel}
              </span>
              <div
                className="flex h-2 min-w-0 flex-1 gap-0.5"
                role="progressbar"
                aria-valuenow={growth.stageLevel}
                aria-valuemin={1}
                aria-valuemax={growth.stageCount}
                aria-label={`성장 단계 ${growth.stageLevel} / ${growth.stageCount}`}
              >
                {Array.from({ length: growth.stageCount }, (_, index) => (
                  <div
                    key={index}
                    className={`min-w-0 flex-1 rounded-[2px] transition-colors duration-500 ${
                      index < growth.stageLevel ? "bg-koala-primary" : "bg-koala-secondary/55"
                    }`}
                  />
                ))}
              </div>
              <span className="shrink-0 text-xs font-medium text-koala-muted">{growth.leafCount} 잎새</span>
            </div>

            <h2 className="mt-2 truncate text-base font-semibold text-koala-heading">{growth.stageName}</h2>
            <div className="mt-1 text-xs leading-snug text-koala-text">
              {splitStageDescription(growth.stageDescription).map((line, index) => (
                <p key={index} className={index > 0 ? "mt-0.5" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
