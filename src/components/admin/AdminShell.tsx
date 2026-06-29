"use client";

import Link from "next/link";

export type AdminTab = "users" | "safety" | "ai-helper";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "users", label: "회원 관리" },
  { id: "safety", label: "안전 검토" },
  { id: "ai-helper", label: "감상문 도우미 기록" },
];

interface AdminShellProps {
  admin: { email: string; name?: string };
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  admin,
  activeTab,
  onTabChange,
  onLogout,
  children,
}: AdminShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-koala-primary">도란서재 관리자</h1>
          <p className="mt-1 text-sm text-koala-muted">
            {admin.name || admin.email} ({admin.email})
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="koala-btn-secondary text-sm">
            도란서재로
          </Link>
          <button type="button" onClick={onLogout} className="koala-btn-secondary text-sm">
            관리자 로그아웃
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-koala bg-koala-secondary/15 p-1 sm:grid-cols-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`rounded-koala py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-koala-card text-koala-primary shadow-sm"
                : "text-koala-muted hover:text-koala-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {children}
    </div>
  );
}

export function AdminLoginGate({
  urlError,
  error,
}: {
  urlError?: string | null;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-koala-primary">관리자</h1>
      <div className="koala-card p-8 text-center">
        <p className="text-sm text-koala-muted">허용된 Google 계정으로 관리자 로그인</p>
        {(urlError || error) && (
          <p className="mt-3 text-sm text-red-500">{urlError || error}</p>
        )}
        <a href="/api/admin/auth/google" className="koala-btn-primary mt-6 inline-block">
          Google로 로그인
        </a>
        <p className="mt-4">
          <Link href="/" className="text-xs text-koala-muted underline">
            도란서재로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
