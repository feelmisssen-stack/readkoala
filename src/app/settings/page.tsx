"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { warnIfInvalidNickname, alertContentFilterApiError } from "@/lib/content-filter-client";

export default function SettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.replace("/");
          return;
        }
        setUsername(d.user.username);
        setNickname(d.user.nickname || d.user.displayName || d.user.username);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  async function saveNickname(e: React.FormEvent) {
    e.preventDefault();
    if (!warnIfInvalidNickname(nickname).ok) return;
    setSavingNickname(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (!alertContentFilterApiError(res, data)) {
          setError(data.error || "닉네임 변경에 실패했어요.");
        }
        return;
      }
      setSuccess("닉네임을 바꿨어요.");
      window.dispatchEvent(new Event("auth-changed"));
    } finally {
      setSavingNickname(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 서로 달라요.");
      return;
    }
    setSavingPassword(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "비밀번호 변경에 실패했어요.");
        return;
      }
      setSuccess("비밀번호를 바꿨어요.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPassword(false);
    }
  }

  if (!username) {
    return <p className="text-center text-koala-muted">불러오는 중...</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <BackLink href="/">홈으로</BackLink>
      <h1 className="text-2xl font-bold text-koala-primary">회원 정보</h1>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-koala-primary">{success}</p>}

      <div className="koala-card p-6 space-y-4">
        <div>
          <label className="koala-label">아이디</label>
          <p className="mt-1 text-sm text-koala-text">{username}</p>
          <p className="mt-1 text-xs text-koala-muted">아이디는 바꿀 수 없어요.</p>
        </div>

        <form onSubmit={saveNickname} className="space-y-3 border-t border-koala-secondary/20 pt-4">
          <h2 className="font-bold text-koala-primary">닉네임</h2>
          <p className="text-xs text-koala-muted">도란서재에서 보이는 이름이에요.</p>
          <input
            className="koala-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            required
            maxLength={20}
          />
          <button type="submit" disabled={savingNickname} className="koala-btn-primary text-sm">
            {savingNickname ? "저장 중..." : "닉네임 저장"}
          </button>
        </form>
      </div>

      <div className="koala-card p-6">
        <form onSubmit={savePassword} className="space-y-3">
          <h2 className="font-bold text-koala-primary">비밀번호 변경</h2>
          <div>
            <label className="koala-label">현재 비밀번호</label>
            <input
              type="password"
              className="koala-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="koala-label">새 비밀번호</label>
            <input
              type="password"
              className="koala-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="koala-label">새 비밀번호 확인</label>
            <input
              type="password"
              className="koala-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword}
            className="koala-btn-secondary text-sm"
          >
            {savingPassword ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
