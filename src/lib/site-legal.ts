export const LEGAL_FOOTER = {
  serviceName: "도란서재",
  copyright: "© 2026 도란서재. All rights reserved.",
  privacyOfficer: {
    name: "이현주",
    role: "교사",
    school: "서울개현초등학교",
    phone: "02-2138-1939",
  },
} as const;

export type LegalDocumentId = "terms" | "privacy";

export const LEGAL_DOCUMENTS: Record<
  LegalDocumentId,
  { title: string; filename: string }
> = {
  terms: { title: "이용약관", filename: "이용약관.md" },
  privacy: { title: "개인정보처리방침", filename: "개인정보처리방침.md" },
};
