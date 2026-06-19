type SaveStatus = "idle" | "saving" | "saved" | "error";

export function AutoSaveBadge({
  status,
  isLoggedIn,
  className = "",
}: {
  status: SaveStatus;
  isLoggedIn: boolean;
  className?: string;
}) {
  if (!isLoggedIn || status === "idle") return null;

  return (
    <span className={`text-xs text-koala-muted ${className}`}>
      {status === "saving" && "저장 중..."}
      {status === "saved" && "자동 저장됨"}
      {status === "error" && "저장에 실패했어요"}
    </span>
  );
}
