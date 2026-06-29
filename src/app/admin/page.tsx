"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminAiHelperTab } from "@/components/admin/AdminAiHelperTab";
import { AdminLoginGate, AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { AdminSafetyReviewTab } from "@/components/admin/AdminSafetyReviewTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";

function parseTab(value: string | null): AdminTab {
  if (value === "safety" || value === "ai-helper") return value;
  return "users";
}

function AdminContent() {
  const searchParams = useSearchParams();
  const [admin, setAdmin] = useState<{ email: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>(parseTab(searchParams.get("tab")));

  const urlError = searchParams.get("error");

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setAdmin(d.admin || null))
      .finally(() => setLoading(false));
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

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-center text-koala-muted">불러오는 중...</p>}>
      <AdminContent />
    </Suspense>
  );
}
