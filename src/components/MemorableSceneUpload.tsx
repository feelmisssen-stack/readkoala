"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Upload } from "lucide-react";
import { iconMd, iconSm } from "@/lib/icon-styles";
import {
  MemorableScenePendingNotice,
  resolveMemorableSceneStatus,
  type MemorableSceneStatus,
} from "@/components/MemorableSceneStatus";
import { useImageDrop } from "@/lib/use-image-drop";
import { compressImageForMemorableScene } from "@/lib/compress-image";

interface MemorableSceneUploadProps {
  bookId: string;
  imageUrl?: string;
  sceneStatus?: MemorableSceneStatus;
  onUploaded: (url: string | undefined, status: MemorableSceneStatus) => void;
  disabled?: boolean;
}

export function MemorableSceneUpload({
  bookId,
  imageUrl,
  sceneStatus,
  onUploaded,
  disabled,
}: MemorableSceneUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<"compress" | "upload" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(imageUrl || "");
  const [status, setStatus] = useState<MemorableSceneStatus | "empty">(
    resolveMemorableSceneStatus(imageUrl, sceneStatus)
  );

  useEffect(() => {
    setPreview(imageUrl || "");
    setStatus(resolveMemorableSceneStatus(imageUrl, sceneStatus));
  }, [imageUrl, sceneStatus]);

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
        setPreview("");
        setStatus("pending");
        onUploaded(undefined, "pending");
        return;
      }

      setPreview(data.imageUrl || "");
      setStatus("approved");
      onUploaded(data.imageUrl, "approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했어요.");
    } finally {
      setUploadStage(null);
      setUploading(false);
    }
  }

  const isPending = status === "pending";
  const { isDragging, dropHandlers } = useImageDrop(
    (file) => {
      void handleFile(file);
    },
    {
      disabled: disabled || uploading,
      onInvalidFile: setError,
    }
  );

  const dropZoneClassName = `flex w-full flex-col items-center gap-3 rounded-koala border-2 border-dashed px-6 py-12 transition disabled:opacity-50 ${
    isDragging
      ? "border-koala-primary bg-koala-primary/10"
      : "border-koala-secondary/50 bg-koala-secondary/10 hover:bg-koala-secondary/20"
  }`;

  return (
    <div className="koala-card space-y-4 p-5" {...dropHandlers}>
      <p className="text-sm text-koala-muted">기억에 남는 장면을 그려서 올려봅시다</p>

      {isPending ? (
        <MemorableScenePendingNotice className="mx-auto w-full max-w-md" />
      ) : preview ? (
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-koala bg-koala-secondary/20">
          <Image src={preview} alt="기억에 남는 장면" fill className="object-contain" unoptimized />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={dropZoneClassName}
        >
          <ImagePlus className={`${iconMd} text-koala-primary`} strokeWidth={1.75} aria-hidden />
          <span className="text-sm text-koala-muted">
            {isDragging ? "여기에 그림을 놓으세요" : "그림 파일을 선택하거나 끌어다 놓으세요"}
          </span>
        </button>
      )}

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

      {(preview || isPending) && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="koala-btn-secondary inline-flex items-center gap-1.5 text-sm"
        >
          <Upload className={iconSm} aria-hidden />
          {isPending ? "다른 그림으로 다시 올리기" : "다른 그림으로 바꾸기"}
        </button>
      )}

      {uploading && (
        <p className="text-xs text-koala-muted">
          {uploadStage === "compress"
            ? "그림 크기를 줄이고 있어요..."
            : "그림을 확인하고 있어요..."}
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
