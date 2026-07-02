import { KoalaGrowthIllustration } from "@/components/KoalaGrowthIllustration";
import { KOALA_STAGES, splitStageDescription } from "@/lib/writing-growth";

export default function KoalaStagesPreviewPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-koala-heading">코알라 10단계 일러스트</h1>
        <p className="mt-2 text-sm text-koala-muted">
          이미지 파일: <code className="text-koala-primary">public/images/koala-stages/</code>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {KOALA_STAGES.map((stage, index) => (
          <article key={stage.level} className="koala-card flex flex-col items-center p-5 text-center">
            <div className="relative mx-auto h-40 w-40">
              <KoalaGrowthIllustration visualTier={index} />
            </div>
            <p className="mt-3 text-xs font-semibold text-koala-accent">Lv. {stage.level}</p>
            <h2 className="mt-1 text-sm font-bold text-koala-heading">{stage.name}</h2>
            <div className="mt-2 text-xs leading-relaxed text-koala-muted">
              {splitStageDescription(stage.description).map((line, lineIndex) => (
                <p key={lineIndex} className={lineIndex > 0 ? "mt-1" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
