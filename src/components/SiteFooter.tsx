"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LegalDocumentModal } from "@/components/LegalDocumentModal";
import { LEGAL_FOOTER, type LegalDocumentId } from "@/lib/site-legal";

export function SiteFooter() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openDocument, setOpenDocument] = useState<LegalDocumentId | null>(null);

  useEffect(() => {
    function loadUser() {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => setIsLoggedIn(Boolean(data.user)))
        .catch(() => setIsLoggedIn(false));
    }

    loadUser();
    window.addEventListener("auth-changed", loadUser);
    return () => window.removeEventListener("auth-changed", loadUser);
  }, [pathname]);

  if (!isLoggedIn) return null;

  const { privacyOfficer } = LEGAL_FOOTER;

  return (
    <>
      <footer className="mt-auto shrink-0 border-t border-koala-secondary/60 bg-koala-card/50">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-center text-xs text-koala-muted">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>{LEGAL_FOOTER.copyright}</span>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setOpenDocument("terms")}
              className="underline decoration-koala-primary/40 underline-offset-2 hover:text-koala-primary"
            >
              이용약관
            </button>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setOpenDocument("privacy")}
              className="underline decoration-koala-primary/40 underline-offset-2 hover:text-koala-primary"
            >
              개인정보처리방침
            </button>
          </p>
          <p>
            개인정보책임자: {privacyOfficer.role} {privacyOfficer.name} ({privacyOfficer.school}) |
            문의: {privacyOfficer.phone}
          </p>
        </div>
      </footer>

      <LegalDocumentModal documentId={openDocument} onClose={() => setOpenDocument(null)} />
    </>
  );
}
