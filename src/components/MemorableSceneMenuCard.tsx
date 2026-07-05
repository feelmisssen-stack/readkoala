"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Upload, X } from "lucide-react";
import { iconMd, iconSm } from "@/lib/icon-styles";
import { SECTION_ICONS } from "@/lib/section-icons";
import { SECTION_LABELS } from "@/lib/reflection-templates";
import {
  MemorableScenePendingNotice,
  resolveMemorableSceneStatus,
  type MemorableSceneStatus,
} from "@/components/MemorableSceneStatus";
import { useImageDrop } from "@/lib/use-image-drop";
import { compressImageForMemorableScene } from "@/lib/compress-image";

interface MemorableSceneMenuCardProps {
  bookId: string;
  initialImageUrl?: string;
  initialSceneStatus?: MemorableSceneStatus;
  onUploaded?: (url: string | undefined, status: MemorableSceneStatus) => void;
  onDeleted?: () => void;
}

export function MemorableSceneMenuCard({
  bookId,
  initialImageUrl,
  initialSceneStatus,
  onUploaded,
  onDeleted,
}: MemorableSceneMenuCardProps) {
  const Icon = SECTION_ICONS.memorable_scene;
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImageUrl || "");
  const [status, setStatus] = useState<MemorableSceneStatus | "empty">(
    resolveMemorableSceneStatus(initialImageUrl, initialSceneStatus)
  );
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<"compress" | "upload" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setImageUrl(initialImageUrl || "");
    setStatus(resolveMemorableSceneStatus(initialImageUrl, initialSceneStatus));
  }, [initialImageUrl, initialSceneStatus]);

  const isPending = status === "pending";
  const hasScene = isPending || !!imageUrl;
  const { isDragging, dropHandlers } = useImageDrop(
    (file) => {
      void handleFile(file);
    },
    {
      disabled: uploading,
      onInvalidFile: setError,
    }
  );

  const dropZoneClassName = `flex w-full flex-col items-center gap-2 rounded-koala border-2 border-dashed px-4 py-8 transition disabled:opacity-50 ${
    isDragging
      ? "border-koala-primary bg-koala-primary/10"
      : "border-koala-secondary/50 bg-koala-secondary/10 hover:bg-koala-secondary/20"
  }`;

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      setUploadStage("compress");
      const compressed = await compressImageForMemorableScene(file);

      setUploadStage("upload");
      const formData = new FormData();
      formData.append("bookId", bookId);
      formData.append("file", compressed);

      const res = await fetch("/api/reflections/memorable-scene", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "업로드에 실패했어요.");
        return;
      }

      const nextStatus = (data.status as MemorableSceneStatus) || "approved";
      if (data.pending || nextStatus === "pending") {
        setImageUrl("");
        setStatus("pending");
        onUploaded?.(undefined, "pending");
        setExpanded(false);
        return;
      }

      setImageUrl(data.imageUrl || "");
      setStatus("approved");
      onUploaded?.(data.imageUrl, "approved");
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했어요.");
    } finally {
      setUploadStage(null);
      setUploading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!hasScene || deleting) return;
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
      setStatus("empty");
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }

  if (expanded) {
    return (
      <div className="koala-card p-4 sm:col-span-2" {...dropHandlers}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Icon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
            <div>
              <h3 className="font-medium text-koala-heading">{SECTION_LABELS.memorable_scene}</h3>
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

        {isPending ? (
          <MemorableScenePendingNotice className="mb-3" />
        ) : null}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={dropZoneClassName}
        >
          <ImagePlus className={`${iconMd} text-koala-primary`} strokeWidth={1.75} aria-hidden />
          <span className="text-sm text-koala-muted">
            {isDragging
              ? "여기에 그림을 놓으세요"
              : isPending
                ? "다른 그림 파일을 선택하거나 끌어다 놓으세요"
                : "그림 파일을 선택하거나 끌어다 놓으세요"}
          </span>
          <span className="text-xs text-koala-muted">JPG, PNG, WEBP, GIF · 자동으로 500KB 이하로 줄여요</span>
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

        {uploading && (
          <p className="mt-2 text-xs text-koala-muted">
            {uploadStage === "compress"
              ? "그림 크기를 줄이고 있어요..."
              : "그림을 확인하고 있어요..."}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={`relative koala-card flex w-full items-center gap-3 p-4 transition ${
        hasScene ? "koala-card-recorded" : "koala-card-section-empty"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Icon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-koala-heading">{SECTION_LABELS.memorable_scene}</h3>
          <p className="mt-0.5 text-xs text-koala-muted">
            {isPending ? "선생님 확인 중이에요" : "기억에 남는 장면을 그려서 올려봅시다"}
          </p>
        </div>
        {!hasScene && <Upload className={`${iconSm} shrink-0 text-koala-muted`} aria-hidden />}
      </button>
      {hasScene && (
        <div className="relative h-14 w-14 shrink-0">
          <div className="relative h-full w-full overflow-hidden rounded-md border border-koala-secondary/30 bg-koala-secondary/10">
            {isPending ? (
              <MemorableScenePendingNotice compact />
            ) : (
              <Image src={imageUrl} alt="기억에 남는 장면 미리보기" fill className="object-cover" unoptimized />
            )}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-koala-card text-koala-muted ring-1 ring-koala-secondary/40 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
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
