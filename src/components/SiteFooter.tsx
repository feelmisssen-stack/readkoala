"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { LegalDocumentModal } from "@/components/LegalDocumentModal";
import { LEGAL_FOOTER, type LegalDocumentId } from "@/lib/site-legal";

export function SiteFooter() {
  const { user } = useAuth();
  const [openDocument, setOpenDocument] = useState<LegalDocumentId | null>(null);

  if (!user) return null;

  return (
    <>
      <footer className="mt-auto shrink-0 border-t border-koala-secondary bg-koala-surface-soft">
        <div className="mx-auto max-w-content px-4 py-4 text-center text-sm text-koala-muted">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>{LEGAL_FOOTER.copyright}</span>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setOpenDocument("terms")}
              className="text-koala-text hover:text-koala-primary"
            >
              이용약관
            </button>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setOpenDocument("privacy")}
              className="text-koala-text hover:text-koala-primary"
            >
              개인정보처리방침
            </button>
          </p>
        </div>
      </footer>

      <LegalDocumentModal documentId={openDocument} onClose={() => setOpenDocument(null)} />
    </>
  );
}
