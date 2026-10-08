"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { KoalaGrowthIllustration } from "@/components/KoalaGrowthIllustration";
import { splitStageDescription } from "@/lib/writing-growth";
import type { WritingGrowth } from "@/lib/writing-growth";
import type { KoalaStatus } from "@/lib/koala-avatar";

interface KoalaGrowthCardProps {
  growth: WritingGrowth;
  /** 관리자 화면은 active만 넘긴다 */
  koala?: Pick<KoalaStatus, "active"> & Partial<KoalaStatus>;
  onOpenMaker?: () => void;
}

function KoalaChangeLine({
  koala,
  onOpenMaker,
}: {
  koala: Pick<KoalaStatus, "active"> & Partial<KoalaStatus>;
  onOpenMaker?: () => void;
}) {
  if (!onOpenMaker || !koala.unlocked) return null;

  const hasPreviews = (koala.previews?.length ?? 0) > 0;
  if (hasPreviews || (koala.stored ?? 0) > 0) {
    return (
      <button
        type="button"
        onClick={onOpenMaker}
        className="mt-2 inline-flex items-center gap-1 rounded-pill bg-koala-accent px-3 py-1 text-xs font-medium text-white transition hover:scale-[1.03]"
      >
        <Sparkles className="size-3.5" aria-hidden />
        {hasPreviews ? "만든 코알라 고르기" : `코알라 바꾸기 · 변신권 ${koala.stored}개`}
      </button>
    );
  }

  return (
    <p className="mt-2 text-xs text-koala-muted">
      다음 변신권까지 {koala.nextChangeInLeaves} 잎새
    </p>
  );
}

export function KoalaGrowthCard({ growth, koala, onOpenMaker }: KoalaGrowthCardProps) {
  const custom = koala?.active ?? null;
  const description = custom
    ? "내가 직접 꾸민 코알라예요!"
    : growth.stageDescription;

  return (
    <div className="relative flex h-full min-w-0 flex-col pl-3 sm:pl-4">
      <div className="flex min-h-0 flex-1 items-center gap-3 sm:min-h-28 sm:gap-4">
        <div className="relative h-24 w-20 shrink-0 sm:h-32 sm:w-28">
          {custom ? (
            <Image
              src={custom.imageUrl}
              alt={custom.name}
              fill
              unoptimized
              className="object-contain object-center mix-blend-multiply"
              sizes="112px"
            />
          ) : (
            <KoalaGrowthIllustration visualTier={growth.visualTier} />
          )}
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

            <h2 className="mt-2 truncate text-base font-semibold text-koala-heading">
              {custom?.name || growth.stageName}
            </h2>
            <div className="mt-1 text-xs leading-snug text-koala-text">
              {splitStageDescription(description).map((line, index) => (
                <p key={index} className={index > 0 ? "mt-0.5" : undefined}>
                  {line}
                </p>
              ))}
            </div>
            {koala && <KoalaChangeLine koala={koala} onOpenMaker={onOpenMaker} />}
          </div>
        </div>
      </div>
    </div>
  );
}
