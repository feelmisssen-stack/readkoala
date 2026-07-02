"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LegalMarkdown } from "@/components/LegalMarkdown";
import type { LegalDocumentId } from "@/lib/site-legal";

interface LegalDocumentModalProps {
  documentId: LegalDocumentId | null;
  onClose: () => void;
}

export function LegalDocumentModal({ documentId, onClose }: LegalDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!documentId) return;

    setLoading(true);
    setError("");
    setContent("");
    fetch(`/api/legal/${documentId}?t=${Date.now()}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "문서를 불러오지 못했어요.");
        }
        setTitle(data.title || "");
        setContent(data.content || "");
      })
      .catch((err) => {
        setTitle("");
        setContent("");
        setError(err instanceof Error ? err.message : "문서를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [documentId, onClose]);

  if (!documentId) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-document-title"
      onClick={onClose}
    >
      <div
        className="koala-card flex max-h-[85vh] w-full max-w-2xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-koala-primary/15 px-5 py-4">
          <h2 id="legal-document-title" className="text-lg font-bold text-koala-heading">
            {title || "문서"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-koala-muted hover:bg-koala-secondary/30 hover:text-koala-primary"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-koala-muted">불러오는 중...</p>}
          {!loading && error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && content && <LegalMarkdown content={content} />}
        </div>

        <div className="border-t border-koala-primary/15 px-5 py-4">
          <button type="button" onClick={onClose} className="koala-btn-primary w-full text-sm">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
