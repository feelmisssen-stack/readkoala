import { Leaf } from "lucide-react";

/** 기록량(1~5)에 따라 나뭇잎 테두리 색이 진해짐 */
const LEAF_STROKE_COLORS = [
  "",
  "#C5D4C8",
  "#A3B899",
  "#6B8F71",
  "#4E6A53",
  "#3D5C45",
] as const;

export function ReadingRecordLeafStamp({
  level,
  className = "",
}: {
  level: number;
  className?: string;
}) {
  if (level < 1 || level > 5) return null;

  const stroke = LEAF_STROKE_COLORS[level];

  return (
    <div
      className={`pointer-events-none ${className}`}
      aria-label="기록 도장"
      title="감상 기록"
    >
      <Leaf
        className="size-9"
        strokeWidth={2}
        style={{ color: stroke }}
        fill="none"
        aria-hidden
      />
    </div>
  );
}
