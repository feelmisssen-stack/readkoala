"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했어요.");
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
          <h1 className="mt-3 text-2xl font-bold text-koala-primary">ReadKoala 로그인</h1>
          <p className="mt-1 text-sm text-koala-muted">아이디와 비밀번호로 들어가요</p>
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
              placeholder="비밀번호"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="koala-btn-primary w-full">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-koala-muted">
          처음이신가요?{" "}
          <Link href="/register" className="text-koala-primary underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
