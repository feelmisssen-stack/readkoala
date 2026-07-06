"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AdminLoginGate, AdminShell, type AdminTab } from "@/components/admin/AdminShell";

const AdminUsersTab = dynamic(
  () => import("@/components/admin/AdminUsersTab").then((m) => m.AdminUsersTab),
  { loading: () => <p className="text-sm text-koala-muted">탭 불러오는 중...</p> }
);
const AdminSafetyReviewTab = dynamic(
  () => import("@/components/admin/AdminSafetyReviewTab").then((m) => m.AdminSafetyReviewTab),
  { loading: () => <p className="text-sm text-koala-muted">탭 불러오는 중...</p> }
);
const AdminAiHelperTab = dynamic(
  () => import("@/components/admin/AdminAiHelperTab").then((m) => m.AdminAiHelperTab),
  { loading: () => <p className="text-sm text-koala-muted">탭 불러오는 중...</p> }
);

function parseTab(value: string | null): AdminTab {
  if (value === "safety" || value === "ai-helper") return value;
  return "users";
}

function readSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function AdminPage() {
  const [admin, setAdmin] = useState<{ email: string; name?: string; username?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(parseTab(readSearchParam("tab")));
    setUrlError(readSearchParam("error"));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    fetch("/api/admin/me", { credentials: "same-origin", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`admin/me ${res.status}`);
        }
        return res.json() as Promise<{ admin?: { email: string; name?: string; username?: string } | null }>;
      })
      .then((data) => setAdmin(data.admin ?? null))
      .catch(() => setAdmin(null))
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  function changeTab(tab: AdminTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setAdmin(null);
  }

  if (loading) {
    return <p className="text-center text-koala-muted">불러오는 중...</p>;
  }

  if (!admin) {
    return <AdminLoginGate urlError={urlError} />;
  }

  return (
    <AdminShell admin={admin} activeTab={activeTab} onTabChange={changeTab} onLogout={logout}>
      {activeTab === "users" && <AdminUsersTab />}
      {activeTab === "safety" && <AdminSafetyReviewTab />}
      {activeTab === "ai-helper" && <AdminAiHelperTab />}
    </AdminShell>
  );
}
