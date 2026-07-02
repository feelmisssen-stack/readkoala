"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function LoginForm({ onSuccess, className = "" }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("서버 오류가 났어요. Vercel 환경 변수(Firebase 키)를 확인해 주세요.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "로그인에 실패했어요.");
        return;
      }
      onSuccess?.();
    } catch {
      setError("로그인 요청에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`mx-auto w-full max-w-md ${className}`}>
      <div className="koala-card p-8">
        <div className="mb-6 text-center">
          <h2 className="font-display text-xl text-koala-heading">도란서재 로그인</h2>
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
              autoComplete="username"
            />
          </div>
          <div>
            <label className="koala-label" htmlFor="login-password">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="koala-input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-koala-muted hover:text-koala-primary"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="koala-btn-primary w-full">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <p className="mt-5 text-center">
          <Link href="/admin" className="text-xs text-koala-muted underline hover:text-koala-primary">
            관리자로 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
