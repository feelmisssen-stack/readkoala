import Image from "next/image";
import { getGrowthStage, getKoalaStageImage } from "@/lib/writing-growth";

interface KoalaGrowthIllustrationProps {
  visualTier: number;
  className?: string;
}

/** 도란서재 코알라 10단계 — 플랫 일러스트 */
export function KoalaGrowthIllustration({ visualTier, className = "" }: KoalaGrowthIllustrationProps) {
  const stage = Math.max(0, Math.min(9, visualTier));
  const stageInfo = getGrowthStage(stage);
  const src = getKoalaStageImage(stage);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <Image
        src={src}
        alt={stageInfo.name}
        fill
        unoptimized
        className="object-contain object-center scale-[1.66]"
        sizes="112px"
        priority={stage <= 1}
      />
    </div>
  );
}
