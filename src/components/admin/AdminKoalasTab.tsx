"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";

interface KoalaItem {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  name: string;
  prompt: string;
  imageUrl: string | null;
  status: "active" | "replaced" | "deleted";
  createdAt: string;
  appliedAt: string | null;
  deletedAt: string | null;
}

const STATUS_LABELS: Record<KoalaItem["status"], { label: string; className: string }> = {
  active: { label: "사용 중", className: "bg-koala-primary text-white" },
  replaced: { label: "이전 코알라", className: "bg-koala-secondary/40 text-koala-text" },
  deleted: { label: "삭제함", className: "bg-red-100 text-red-600" },
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("ko-KR") : "";
}

export function AdminKoalasTab() {
  const [koalas, setKoalas] = useState<KoalaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadKoalas = useCallback(() => {
    setLoading(true);
    return fetch("/api/admin/koalas")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => setKoalas(d.koalas || []))
      .catch(() => setError("코알라 목록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadKoalas();
  }, [loadKoalas]);

  const userOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const koala of koalas) {
      if (!seen.has(koala.userId)) seen.set(koala.userId, `${koala.nickname} (${koala.username})`);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "ko"));
  }, [koalas]);

  const visible =
    userFilter === "all" ? koalas : koalas.filter((koala) => koala.userId === userFilter);
  const activeCount = koalas.filter((koala) => koala.status === "active").length;

  async function deleteKoala(koala: KoalaItem) {
    const message =
      koala.status === "active"
        ? `${koala.nickname}(${koala.username})의 「${koala.name}」을 삭제할까요?\n바로 전 코알라(없으면 기본 단계 코알라)로 돌아가고, 변신권은 돌려주지 않아요.`
        : `${koala.nickname}(${koala.username})의 「${koala.name}」을 삭제할까요?`;
    if (!confirm(message)) return;

    setDeletingId(koala.id);
    setError("");
    try {
      const res = await fetch("/api/admin/koalas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: koala.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "삭제에 실패했어요.");
        return;
      }
      await loadKoalas();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-koala-muted">불러오는 중...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-koala-heading">코알라</h2>
          <p className="mt-1 text-sm text-koala-muted">
            10단계를 넘은 학생들이 AI로 바꾼 코알라예요. 부적절하면 삭제할 수 있어요.
          </p>
          <p className="mt-1 text-sm text-koala-muted">
            사용 중 {activeCount}마리 · 전체 {koalas.length}마리
          </p>
        </div>
        {userOptions.length > 0 && (
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-koala border border-koala-secondary/40 bg-white px-3 py-2 text-sm"
            aria-label="학생별로 보기"
          >
            <option value="all">모든 학생</option>
            {userOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {visible.length === 0 ? (
        <div className="koala-card p-8 text-center text-sm text-koala-muted">
          아직 바꾼 코알라가 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((koala) => {
            const badge = STATUS_LABELS[koala.status];
            return (
              <article
                key={koala.id}
                className={`koala-card flex flex-col overflow-hidden ${
                  koala.status === "deleted" ? "opacity-60" : ""
                }`}
              >
                {koala.imageUrl ? (
                  <a
                    href={koala.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block aspect-square w-full bg-white"
                    title="크게 보기"
                  >
                    <Image
                      src={koala.imageUrl}
                      alt={koala.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <ExternalLink
                      className="absolute right-2 top-2 size-4 text-koala-muted opacity-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </a>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-koala-secondary/20 text-xs text-koala-muted">
                    그림을 삭제했어요
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
                  <span
                    className={`w-fit rounded-pill px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <p className="font-medium text-koala-heading">{koala.name}</p>
                  <p className="truncate text-koala-primary">
                    {koala.nickname} ({koala.username})
                  </p>
                  <p className="text-xs text-koala-muted">
                    {koala.status === "deleted"
                      ? `${formatDate(koala.deletedAt)} 삭제`
                      : `${formatDate(koala.appliedAt ?? koala.createdAt)} 적용`}
                  </p>
                  {koala.status !== "deleted" && (
                    <button
                      type="button"
                      disabled={deletingId === koala.id}
                      onClick={() => deleteKoala(koala)}
                      className="koala-btn-secondary mt-2 inline-flex items-center justify-center gap-1 text-sm text-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {deletingId === koala.id ? "삭제 중..." : "삭제"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
