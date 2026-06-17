export function ReadingThermometer({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  const label =
    clamped === 0
      ? "아직 시작 전"
      : clamped < 30
        ? "막 읽기 시작"
        : clamped < 60
          ? "열심히 읽는 중"
          : clamped < 90
            ? "거의 다 읽음"
            : "다 읽었어요!";

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-koala-muted">
        <span>독서 온도계 🌡️</span>
        <span>{label}</span>
      </div>
      <div className="relative h-6 overflow-hidden rounded-pill bg-koala-secondary/30">
        <div
          className="h-full rounded-pill transition-all duration-500"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, #A3B899, #E6A15C, #E85D4C)`,
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-koala-text">
          {clamped}%
        </span>
      </div>
    </div>
  );
}
