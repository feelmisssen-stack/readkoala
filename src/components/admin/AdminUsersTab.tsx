"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { AdminUserBookshelf } from "@/components/admin/AdminUserBookshelf";
import {
  alertContentFilterApiError,
  warnIfInvalidContent,
  warnIfInvalidNickname,
} from "@/lib/content-filter-client";

interface AdminUser {
  id: string;
  username: string;
  nickname?: string;
  isAdmin: boolean;
  lastActivityAt: string | null;
  bookCount: number;
  reflectionCount: number;
  leafCount: number;
  stageLevel: number;
}

type SortKey =
  | "username"
  | "nickname"
  | "lastActivityAt"
  | "bookCount"
  | "reflectionCount"
  | "leafCount"
  | "stageLevel";
type SortDirection = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string; defaultDirection: SortDirection }[] = [
  { key: "username", label: "아이디", defaultDirection: "asc" },
  { key: "nickname", label: "닉네임", defaultDirection: "asc" },
  { key: "lastActivityAt", label: "최근 활동", defaultDirection: "desc" },
  { key: "bookCount", label: "책", defaultDirection: "desc" },
  { key: "reflectionCount", label: "감상", defaultDirection: "desc" },
  { key: "leafCount", label: "잎새", defaultDirection: "desc" },
  { key: "stageLevel", label: "Lv.", defaultDirection: "desc" },
];

function formatActivityDate(value: string | null) {
  if (!value) return "기록 없음";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 빈 값(닉네임 없음, 활동 기록 없음)은 정렬 방향과 상관없이 맨 아래로 */
function compareUsers(a: AdminUser, b: AdminUser, key: SortKey, direction: SortDirection) {
  const sign = direction === "asc" ? 1 : -1;

  if (key === "bookCount" || key === "reflectionCount" || key === "leafCount" || key === "stageLevel") {
    return (a[key] - b[key]) * sign;
  }

  const left = key === "lastActivityAt" ? a.lastActivityAt : key === "nickname" ? a.nickname?.trim() : a.username;
  const right = key === "lastActivityAt" ? b.lastActivityAt : key === "nickname" ? b.nickname?.trim() : b.username;
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  if (key === "lastActivityAt") {
    return (new Date(left).getTime() - new Date(right).getTime()) * sign;
  }
  return left.localeCompare(right, "ko", { numeric: true }) * sign;
}

export function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("username");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [shelfUser, setShelfUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [creating, setCreating] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  function loadUsers() {
    return fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d?.users) setUsers(d.users);
      });
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => compareUsers(a, b, sortKey, sortDirection)),
    [users, sortKey, sortDirection]
  );

  function changeSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(SORT_COLUMNS.find((column) => column.key === key)?.defaultDirection ?? "asc");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!warnIfInvalidContent(newUsername).ok) return;
    if (newNickname.trim() && !warnIfInvalidNickname(newNickname).ok) return;
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, nickname: newNickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (!alertContentFilterApiError(res, data)) {
          setError(data.error || "계정 생성에 실패했어요.");
        }
        return;
      }
      setSuccess(`「${data.user.username}」계정을 만들었어요.`);
      setNewUsername("");
      setNewPassword("");
      setNewNickname("");
      await loadUsers();
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(user: AdminUser) {
    if (!confirm(`「${user.username}」비밀번호를 gh1234로 바꿀까요?`)) return;
    setResettingId(user.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "gh1234" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "비밀번호 초기화에 실패했어요.");
        return;
      }
      setSuccess(`「${user.username}」비밀번호를 gh1234로 바꿨어요.`);
    } finally {
      setResettingId(null);
    }
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`「${username}」회원을 삭제할까요? 책과 감상도 함께 지워져요.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSuccess(`「${username}」회원을 삭제했어요.`);
      loadUsers();
    } else {
      const data = await res.json();
      setError(data.error || "삭제에 실패했어요.");
    }
  }

  if (shelfUser) {
    return (
      <AdminUserBookshelf
        userId={shelfUser.id}
        label={
          shelfUser.nickname?.trim()
            ? `${shelfUser.nickname} (${shelfUser.username})`
            : shelfUser.username
        }
        onBack={() => setShelfUser(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-koala-primary">{success}</p>}

      <div className="koala-card p-6">
        <h2 className="font-display text-koala-heading">새 계정 만들기</h2>
        <p className="mt-1 text-sm text-koala-muted">학생에게 배부할 아이디와 초기 비밀번호를 입력하세요.</p>
        <form
          onSubmit={createUser}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label className="koala-label">아이디</label>
            <input
              className="koala-input"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="예: student01"
              required
            />
          </div>
          <div>
            <label className="koala-label">닉네임</label>
            <input
              className="koala-input"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="예: 코코"
            />
          </div>
          <div>
            <label className="koala-label">초기 비밀번호</label>
            <input
              type="text"
              className="koala-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="4자 이상"
              required
              minLength={4}
            />
          </div>
          <button type="submit" disabled={creating} className="koala-btn-primary text-sm">
            {creating ? "만드는 중..." : "계정 생성"}
          </button>
        </form>
      </div>

      <div className="koala-card overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-koala-secondary/30 text-koala-muted">
              {SORT_COLUMNS.map((column) => {
                const active = column.key === sortKey;
                const SortIcon = !active ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    className="p-3"
                    aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => changeSort(column.key)}
                      className={`inline-flex items-center gap-1 hover:text-koala-heading ${
                        active ? "text-koala-heading" : ""
                      }`}
                    >
                      {column.label}
                      <SortIcon className={`size-3.5 ${active ? "" : "opacity-40"}`} aria-hidden />
                    </button>
                  </th>
                );
              })}
              <th className="p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.id} className="border-b border-koala-secondary/15">
                <td className="p-3 font-medium">
                  {u.username}
                  {u.isAdmin && (
                    <span className="ml-2 rounded-pill bg-koala-accent/20 px-2 py-0.5 text-xs text-koala-accent">
                      앱관리자
                    </span>
                  )}
                </td>
                <td className="p-3 text-koala-muted">{u.nickname || "—"}</td>
                <td className="p-3 whitespace-nowrap text-koala-muted">{formatActivityDate(u.lastActivityAt)}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => setShelfUser(u)}
                    title={`${u.username}의 책장 보기`}
                    className="text-koala-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {u.bookCount}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => setShelfUser(u)}
                    title={`${u.username}의 책장 보기`}
                    className="text-koala-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {u.reflectionCount}
                  </button>
                </td>
                <td className="p-3">{u.leafCount}</td>
                <td className="p-3 whitespace-nowrap">Lv.{u.stageLevel}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => resetPassword(u)}
                      disabled={resettingId === u.id}
                      className="text-xs text-koala-primary underline hover:opacity-80 disabled:opacity-50"
                    >
                      {resettingId === u.id ? "처리 중..." : "비밀번호 초기화"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteUser(u.id, u.username)}
                      className="text-xs text-red-500 underline hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
