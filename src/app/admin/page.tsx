"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  bookCount: number;
  reflectionCount: number;
  stats: { booksRead: number; totalChars: number; level: number };
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-center text-koala-muted">불러오는 중...</p>}>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const searchParams = useSearchParams();
  const [admin, setAdmin] = useState<{ email: string; name?: string } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urlError = searchParams.get("error");

  function loadUsers() {
    return fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 401) {
          setAdmin(null);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.users) setUsers(d.users);
      });
  }

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => {
        setAdmin(d.admin || null);
        if (d.admin) return loadUsers();
      })
      .finally(() => setLoading(false));
  }, []);

  async function deleteUser(id: string, username: string) {
    if (!confirm(`「${username}」회원을 삭제할까요? 책과 감상도 함께 지워져요.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) loadUsers();
    else {
      const data = await res.json();
      setError(data.error || "삭제에 실패했어요.");
    }
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setAdmin(null);
    setUsers([]);
  }

  if (loading) {
    return <p className="text-center text-koala-muted">불러오는 중...</p>;
  }

  if (!admin) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-koala-primary">관리자</h1>
        <div className="koala-card p-8 text-center">
          <p className="text-sm text-koala-muted">Google 계정으로 관리자 로그인</p>
          {(urlError || error) && (
            <p className="mt-3 text-sm text-red-500">{urlError || error}</p>
          )}
          <a href="/api/admin/auth/google" className="koala-btn-primary mt-6 inline-block">
            Google로 로그인
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-koala-primary">회원 관리</h1>
          <p className="mt-1 text-sm text-koala-muted">
            {admin.name || admin.email} ({admin.email})
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="koala-btn-secondary text-sm">
            도란서재로
          </Link>
          <button type="button" onClick={logout} className="koala-btn-secondary text-sm">
            관리자 로그아웃
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="koala-card overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-koala-secondary/30 text-koala-muted">
              <th className="p-3">아이디</th>
              <th className="p-3">가입일</th>
              <th className="p-3">책</th>
              <th className="p-3">감상</th>
              <th className="p-3">관리</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-koala-secondary/15">
                <td className="p-3 font-medium">
                  {u.username}
                  {u.isAdmin && (
                    <span className="ml-2 rounded-pill bg-koala-accent/20 px-2 py-0.5 text-xs text-koala-accent">
                      앱관리자
                    </span>
                  )}
                </td>
                <td className="p-3 text-koala-muted">
                  {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="p-3">{u.bookCount}</td>
                <td className="p-3">{u.reflectionCount}</td>
                <td className="p-3 text-koala-muted">Lv.{u.stats.level}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => deleteUser(u.id, u.username)}
                    className="text-xs text-red-500 underline hover:text-red-600"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
