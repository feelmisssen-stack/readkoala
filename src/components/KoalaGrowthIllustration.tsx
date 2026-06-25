import Image from "next/image";
import { getGrowthStage, getKoalaStageImage } from "@/lib/writing-growth";

interface KoalaGrowthIllustrationProps {
  visualTier: number;
  className?: string;
}

/** 도란서재 코알라 10단계 — 수채화 스타일 일러스트 */
export function KoalaGrowthIllustration({ visualTier, className = "" }: KoalaGrowthIllustrationProps) {
  const stage = Math.max(0, Math.min(9, visualTier));
  const stageInfo = getGrowthStage(stage);
  const src = getKoalaStageImage(stage);

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[9rem] ${className}`}>
      <Image
        src={src}
        alt={stageInfo.name}
        fill
        className="object-contain"
        sizes="(max-width: 640px) 144px, 160px"
        priority={stage <= 1}
      />
    </div>
  );
}
