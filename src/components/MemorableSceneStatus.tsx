export type MemorableSceneStatus = "approved" | "pending";

interface MemorableScenePendingNoticeProps {
  className?: string;
  compact?: boolean;
}

export function MemorableScenePendingNotice({
  className = "",
  compact = false,
}: MemorableScenePendingNoticeProps) {
  if (compact) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-md bg-koala-accent/10 px-2 py-2 text-center ${className}`}
      >
        <span className="rounded-pill bg-koala-accent/20 px-2 py-0.5 text-[10px] font-semibold text-koala-accent">
          승인중
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-koala border border-koala-accent/30 bg-koala-accent/10 px-4 py-8 text-center ${className}`}
    >
      <span className="rounded-pill bg-koala-accent/20 px-3 py-1 text-xs font-semibold text-koala-accent">
        승인중
      </span>
      <p className="text-sm text-koala-muted">폭력적이거나 어린이에게 맞지 않는 그림은 바로 올릴 수 없어요.</p>
      <p className="text-xs text-koala-muted">선생님이 확인한 뒤에 보여져요.</p>
    </div>
  );
}

export function resolveMemorableSceneStatus(
  imageUrl?: string,
  status?: MemorableSceneStatus
): MemorableSceneStatus | "empty" {
  if (status === "pending") return "pending";
  if (imageUrl?.trim()) return "approved";
  return "empty";
}
