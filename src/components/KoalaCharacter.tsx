import type { UserStats } from "@/lib/types";
import { getKoalaStage } from "@/lib/gamification";

export function KoalaCharacter({ stats }: { stats: UserStats }) {
  const stage = getKoalaStage(stats.level);

  return (
    <div className="koala-card p-6 text-center">
      <div className="mb-2 flex justify-center gap-2 text-2xl">
        {stage.decorations.map((d, i) => (
          <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
            {d}
          </span>
        ))}
      </div>
      <div className="text-6xl">{stage.emoji}</div>
      <h3 className="mt-3 text-lg font-bold text-koala-primary">{stage.title}</h3>
      <p className="mt-1 text-sm text-koala-muted">{stage.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-koala bg-koala-secondary/20 p-2">
          <div className="font-bold text-koala-primary">{stats.booksRead}</div>
          <div className="text-koala-muted">읽은 책</div>
        </div>
        <div className="rounded-koala bg-koala-secondary/20 p-2">
          <div className="font-bold text-koala-primary">{stats.totalChars}</div>
          <div className="text-koala-muted">쓴 글자</div>
        </div>
        <div className="rounded-koala bg-koala-secondary/20 p-2">
          <div className="font-bold text-koala-primary">{stats.chatParticipations}</div>
          <div className="text-koala-muted">이야기방</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-koala-muted">
          <span>레벨 {stats.level}</span>
          <span>다음 단계까지 열심히!</span>
        </div>
        <div className="h-3 overflow-hidden rounded-pill bg-koala-secondary/30">
          <div
            className="h-full rounded-pill bg-koala-accent transition-all"
            style={{ width: `${Math.min(100, (stats.level / 10) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
