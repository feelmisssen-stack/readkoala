"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";

interface SceneItem {
  reflectionId: string;
  userId: string;
  username: string;
  nickname: string;
  bookId: string;
  bookTitle: string;
  imageUrl: string;
  updatedAt: string;
}

export function AdminScenesTab() {
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadScenes = useCallback(() => {
    setLoading(true);
    return fetch("/api/admin/scenes")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => setScenes(d.scenes || []))
      .catch(() => setError("그림 목록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadScenes();
  }, [loadScenes]);

  const userOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const scene of scenes) {
      if (!seen.has(scene.userId)) seen.set(scene.userId, `${scene.nickname} (${scene.username})`);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "ko"));
  }, [scenes]);

  const visibleScenes =
    userFilter === "all" ? scenes : scenes.filter((scene) => scene.userId === userFilter);

  async function deleteScene(scene: SceneItem) {
    if (
      !confirm(
        `${scene.nickname}(${scene.username})의 「${scene.bookTitle}」 그림을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`
      )
    ) {
      return;
    }
    setDeletingId(scene.reflectionId);
    setError("");
    try {
      const res = await fetch("/api/admin/scenes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflectionId: scene.reflectionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "삭제에 실패했어요.");
        return;
      }
      setScenes((prev) => prev.filter((item) => item.reflectionId !== scene.reflectionId));
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
          <h2 className="font-display text-koala-heading">그림 검토</h2>
          <p className="mt-1 text-sm text-koala-muted">
            학생들이 &lsquo;기억에 남는 장면&rsquo;에 올린 그림을 직접 검토해요. 직접 그린 그림이 아니면 삭제할 수 있어요.
          </p>
          <p className="mt-1 text-sm text-koala-muted">
            {userFilter === "all"
              ? `전체 ${scenes.length}장`
              : `${visibleScenes.length}장 / 전체 ${scenes.length}장`}
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

      {visibleScenes.length === 0 ? (
        <div className="koala-card p-8 text-center text-sm text-koala-muted">
          저장된 그림이 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleScenes.map((scene) => (
            <article key={scene.reflectionId} className="koala-card flex flex-col overflow-hidden">
              <a
                href={scene.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-[4/3] w-full bg-koala-secondary/20"
                title="크게 보기"
              >
                <Image
                  src={scene.imageUrl}
                  alt={`${scene.nickname}의 ${scene.bookTitle} 그림`}
                  fill
                  className="object-contain"
                  unoptimized
                />
                <ExternalLink
                  className="absolute right-2 top-2 size-4 text-white opacity-0 drop-shadow group-hover:opacity-100"
                  aria-hidden
                />
              </a>
              <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
                <p className="truncate font-medium text-koala-primary">
                  {scene.nickname} ({scene.username})
                </p>
                <p className="truncate text-koala-muted">{scene.bookTitle}</p>
                <p className="text-xs text-koala-muted">
                  {new Date(scene.updatedAt).toLocaleDateString("ko-KR")}
                </p>
                <button
                  type="button"
                  disabled={deletingId === scene.reflectionId}
                  onClick={() => deleteScene(scene)}
                  className="koala-btn-secondary mt-2 inline-flex items-center justify-center gap-1 text-sm text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                  {deletingId === scene.reflectionId ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
