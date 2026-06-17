"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "가입에 실패했어요.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="koala-card p-8">
        <div className="mb-6 text-center">
          <div className="text-5xl">🐨</div>
          <h1 className="mt-3 text-2xl font-bold text-koala-primary">ReadKoala 가입</h1>
          <p className="mt-1 text-sm text-koala-muted">아이디와 비밀번호를 만들어요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="koala-label">아이디</label>
            <input
              className="koala-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="내 아이디"
              required
            />
          </div>
          <div>
            <label className="koala-label">비밀번호</label>
            <input
              type="password"
              className="koala-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (4자 이상)"
              required
            />
          </div>
          <div>
            <label className="koala-label">비밀번호 확인</label>
            <input
              type="password"
              className="koala-input"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 다시 입력"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="koala-btn-primary w-full">
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-koala-muted">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="text-koala-primary underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
