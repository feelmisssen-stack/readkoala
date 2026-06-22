"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Upload, X } from "lucide-react";
import { iconMd, iconSm } from "@/lib/icon-styles";
import { SECTION_ICONS } from "@/lib/section-icons";
import { SECTION_LABELS } from "@/lib/reflection-templates";

interface MemorableSceneMenuCardProps {
  bookId: string;
  initialImageUrl?: string;
  onUploaded?: (url: string) => void;
  onDeleted?: () => void;
}

export function MemorableSceneMenuCard({
  bookId,
  initialImageUrl,
  onUploaded,
  onDeleted,
}: MemorableSceneMenuCardProps) {
  const Icon = SECTION_ICONS.memorable_scene;
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setImageUrl(initialImageUrl || "");
  }, [initialImageUrl]);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("bookId", bookId);
      formData.append("file", file);

      const res = await fetch("/api/reflections/memorable-scene", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "업로드에 실패했어요.");
        return;
      }
      setImageUrl(data.imageUrl);
      onUploaded?.(data.imageUrl);
      setExpanded(false);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!imageUrl || deleting) return;
    if (!confirm("올린 그림을 지울까요?")) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/reflections/memorable-scene?bookId=${encodeURIComponent(bookId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "삭제에 실패했어요.");
        return;
      }
      setImageUrl("");
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }

  if (expanded) {
    return (
      <div className="koala-card p-4 sm:col-span-2">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Icon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
            <div>
              <h3 className="font-medium text-koala-primary">{SECTION_LABELS.memorable_scene}</h3>
              <p className="mt-0.5 text-xs text-koala-muted">기억에 남는 장면을 그려서 올려봅시다</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-full p-1 text-koala-muted hover:bg-koala-secondary/20"
            aria-label="닫기"
          >
            <X className={iconSm} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center gap-2 rounded-koala border-2 border-dashed border-koala-secondary/50 bg-koala-secondary/10 px-4 py-8 transition hover:bg-koala-secondary/20 disabled:opacity-50"
        >
          <ImagePlus className={`${iconMd} text-koala-primary`} strokeWidth={1.75} aria-hidden />
          <span className="text-sm text-koala-muted">그림 파일을 선택하세요</span>
          <span className="text-xs text-koala-muted">JPG, PNG, WEBP, GIF · 최대 5MB</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        {uploading && <p className="mt-2 text-xs text-koala-muted">업로드 중...</p>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={`relative koala-card flex w-full items-center gap-3 p-4 transition ${
        imageUrl ? "koala-card-recorded" : "hover:bg-koala-secondary/10"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Icon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-koala-primary">{SECTION_LABELS.memorable_scene}</h3>
          <p className="mt-0.5 text-xs text-koala-muted">기억에 남는 장면을 그려서 올려봅시다</p>
        </div>
        {!imageUrl && <Upload className={`${iconSm} shrink-0 text-koala-muted`} aria-hidden />}
      </button>
      {imageUrl && (
        <div className="relative h-14 w-14 shrink-0">
          <div className="relative h-full w-full overflow-hidden rounded-md border border-koala-secondary/30 bg-koala-secondary/10">
            <Image src={imageUrl} alt="기억에 남는 장면 미리보기" fill className="object-cover" unoptimized />
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-koala-card text-koala-muted shadow-sm ring-1 ring-koala-secondary/40 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            aria-label="그림 삭제"
          >
            <X className="size-3" strokeWidth={2.5} />
          </button>
        </div>
      )}
      {error && <p className="absolute bottom-1 left-4 text-xs text-red-500">{error}</p>}
    </div>
  );
}
