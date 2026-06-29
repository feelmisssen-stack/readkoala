"use client";

import { useRef, useState, type DragEvent } from "react";

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function useImageDrop(
  onFile: (file: File) => void,
  options?: { disabled?: boolean; onInvalidFile?: (message: string) => void }
) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const disabled = options?.disabled ?? false;

  function resetDragState() {
    dragDepth.current = 0;
    setIsDragging(false);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    resetDragState();
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      options?.onInvalidFile?.("JPG, PNG, WEBP, GIF 파일만 올릴 수 있어요.");
      return;
    }

    onFile(file);
  }

  return {
    isDragging,
    dropHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
