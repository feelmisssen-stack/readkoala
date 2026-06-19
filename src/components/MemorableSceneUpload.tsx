"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Upload } from "lucide-react";
import { iconMd, iconSm } from "@/lib/icon-styles";

interface MemorableSceneUploadProps {
  bookId: string;
  imageUrl?: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

export function MemorableSceneUpload({
  bookId,
  imageUrl,
  onUploaded,
  disabled,
}: MemorableSceneUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(imageUrl || "");

  useEffect(() => {
    setPreview(imageUrl || "");
  }, [imageUrl]);

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
      setPreview(data.imageUrl);
      onUploaded(data.imageUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="koala-card space-y-4 p-5">
      <p className="text-sm text-koala-muted">기억에 남는 장면을 그려서 올려봅시다</p>

      {preview ? (
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-koala bg-koala-secondary/20">
          <Image src={preview} alt="기억에 남는 장면" fill className="object-contain" unoptimized />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full flex-col items-center gap-3 rounded-koala border-2 border-dashed border-koala-secondary/50 bg-koala-secondary/10 px-6 py-12 transition hover:bg-koala-secondary/20 disabled:opacity-50"
        >
          <ImagePlus className={`${iconMd} text-koala-primary`} strokeWidth={1.75} aria-hidden />
          <span className="text-sm text-koala-muted">그림 파일을 선택하세요</span>
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

      {preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="koala-btn-secondary inline-flex items-center gap-1.5 text-sm"
        >
          <Upload className={iconSm} aria-hidden />
          다른 그림으로 바꾸기
        </button>
      )}

      {uploading && <p className="text-xs text-koala-muted">업로드 중...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
