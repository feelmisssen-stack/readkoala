"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
interface SafetyItem {
  id: string;
  kind: "scene_image" | "text_report";
  kindLabel: string;
  userId: string;
  username: string;
  nickname: string;
  bookId?: string;
  bookTitle?: string;
  createdAt: string;
  imageUrl?: string;
  textPreview?: string;
  reason?: string;
  source?: string;
  sourceLabel?: string;
  fieldLabel?: string;
  reflectionId?: string;
  reportId?: string;
}

export function AdminSafetyReviewTab() {
  const [items, setItems] = useState<SafetyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const loadItems = useCallback(() => {
    setLoading(true);
    return fetch("/api/admin/moderation")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => setItems(d.items || []))
      .catch(() => setError("목록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function review(action: "approve" | "reject" | "dismiss", item: SafetyItem) {
    setActingId(item.id);
    setError("");
    try {
      const body =
        item.kind === "scene_image"
          ? { action, reflectionId: item.reflectionId }
          : { action: "dismiss", reportId: item.reportId };
      const res = await fetch("/api/admin/moderation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "처리에 실패했어요.");
        return;
      }
      await loadItems();
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-koala-muted">불러오는 중...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-koala-heading">안전 검토</h2>
        <p className="mt-1 text-sm text-koala-muted">
          부적절한 그림이나 내용이 감지되면 여기에 모여요. 승인하거나 거절할 수 있어요.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {items.length === 0 ? (
        <div className="koala-card p-8 text-center text-sm text-koala-muted">
          검토할 항목이 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="koala-card flex h-full flex-col space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-pill bg-koala-accent/15 px-2.5 py-0.5 text-xs font-semibold text-koala-accent">
                      {item.kindLabel}
                    </span>
                    <span className="text-xs text-koala-muted">
                      {new Date(item.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-koala-primary">
                    {item.nickname} ({item.username})
                  </p>
                  {item.bookTitle && (
                    <p className="text-sm text-koala-muted">책: {item.bookTitle}</p>
                  )}
                  {item.fieldLabel && (
                    <p className="text-sm text-koala-muted">위치: {item.fieldLabel}</p>
                  )}
                  {item.sourceLabel && item.kind === "text_report" && (
                    <p className="text-sm text-koala-muted">종류: {item.sourceLabel}</p>
                  )}
                  {item.reason && (
                    <p className="mt-1 text-sm text-koala-accent">사유: {item.reason}</p>
                  )}
                </div>
              </div>

              {item.kind === "scene_image" && item.imageUrl && (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-koala bg-koala-secondary/20">
                  <Image
                    src={item.imageUrl}
                    alt="검토할 그림"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}

              {item.kind === "text_report" && item.textPreview && (
                <div className="max-h-40 overflow-y-auto rounded-koala bg-koala-secondary/15 p-4 text-sm whitespace-pre-wrap">
                  {item.textPreview}
                </div>
              )}

              <div className="mt-auto flex flex-wrap gap-2">
                {item.kind === "scene_image" ? (
                  <>
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => review("approve", item)}
                      className="koala-btn-primary text-sm disabled:opacity-50"
                    >
                      승인하기
                    </button>
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => review("reject", item)}
                      className="koala-btn-secondary text-sm text-red-500 disabled:opacity-50"
                    >
                      거절하기
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => review("dismiss", item)}
                    className="koala-btn-primary text-sm disabled:opacity-50"
                  >
                    확인 완료
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
