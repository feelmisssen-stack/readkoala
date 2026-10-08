"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { KoalaStatus } from "@/lib/koala-avatar";

interface KoalaMakerDialogProps {
  status: KoalaStatus;
  onClose: () => void;
  onStatusChange: (status: KoalaStatus) => void;
}

export function KoalaMakerDialog({ status, onClose, onStatusChange }: KoalaMakerDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<"generate" | "apply" | null>(null);
  const [error, setError] = useState("");

  const hasPreviews = status.previews.length > 0;
  const canGenerate = hasPreviews ? status.retriesLeft > 0 : status.stored > 0;

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose]);

  async function generate() {
    const text = prompt.trim();
    if (!text) {
      setError("어떤 코알라로 바꿀지 적어 주세요.");
      return;
    }
    if (
      !hasPreviews &&
      !confirm(`「${text} 코알라」를 만들까요?\n변신권 1개를 사용해요. 한 번은 무료로 다시 만들 수 있어요.`)
    ) {
      return;
    }

    setBusy("generate");
    setError("");
    try {
      const res = await fetch("/api/koala/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "코알라를 만들지 못했어요.");
        return;
      }
      setPrompt("");
      onStatusChange(data.koala);
    } finally {
      setBusy(null);
    }
  }

  async function apply(avatarId: string, name: string) {
    if (!confirm(`「${name}」로 정할까요?\n고르지 않은 코알라는 사라져요.`)) return;

    setBusy("apply");
    setError("");
    try {
      const res = await fetch("/api/koala/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "코알라를 정하지 못했어요.");
        return;
      }
      onStatusChange(data.koala);
      onClose();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="나만의 코알라 만들기"
    >
      <div className="koala-card relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          disabled={!!busy}
          className="absolute right-3 top-3 rounded-full p-1 text-koala-muted hover:bg-koala-secondary/20 disabled:opacity-40"
          aria-label="닫기"
        >
          <X className="size-5" aria-hidden />
        </button>

        <h2 className="flex items-center gap-1.5 font-display text-lg text-koala-heading">
          <Sparkles className="size-5 text-koala-accent" aria-hidden />
          나만의 코알라 만들기
        </h2>
        <p className="mt-1 text-sm text-koala-muted">
          {hasPreviews
            ? "마음에 드는 코알라를 골라 주세요. 창을 닫아도 나중에 다시 고를 수 있어요."
            : `남은 변신권 ${status.stored}개 (최대 ${status.maxStored}개까지 모여요)`}
        </p>

        {hasPreviews && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {status.previews.map((preview) => (
              <div key={preview.id} className="flex flex-col items-center gap-2 rounded-koala bg-white p-3">
                <div className="relative aspect-square w-full">
                  <Image
                    src={preview.imageUrl}
                    alt={preview.name}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="200px"
                  />
                </div>
                <p className="line-clamp-2 text-center text-sm font-medium text-koala-heading">
                  {preview.name}
                </p>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => apply(preview.id, preview.name)}
                  className="koala-btn-primary w-full text-sm disabled:opacity-50"
                >
                  이걸로 할래요
                </button>
              </div>
            ))}
          </div>
        )}

        {canGenerate && (
          <div className="mt-5 space-y-2">
            <label className="koala-label text-sm" htmlFor="koala-prompt">
              {hasPreviews
                ? `마음에 안 들면 한 번 더 만들 수 있어요 (무료 ${status.retriesLeft}번)`
                : "어떤 코알라로 변신할까요?"}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="koala-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, status.promptMaxLength))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void generate();
                }}
                maxLength={status.promptMaxLength}
                placeholder="예: 우주를 여행하는"
                disabled={!!busy}
                className="koala-input min-w-0 flex-1"
              />
              <span className="shrink-0 text-sm font-medium text-koala-heading">코알라</span>
            </div>
            <p className="text-xs text-koala-muted">
              {prompt.length}/{status.promptMaxLength}자 · 이름이 &lsquo;{prompt.trim() || "○○"} 코알라&rsquo;가 돼요
            </p>
            <button
              type="button"
              disabled={!!busy || !prompt.trim()}
              onClick={generate}
              className="koala-btn-accent w-full text-sm disabled:opacity-50"
            >
              {busy === "generate"
                ? "코알라를 그리는 중이에요... (10~30초)"
                : hasPreviews
                  ? "다시 만들기"
                  : "만들기 (변신권 1개 사용)"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
